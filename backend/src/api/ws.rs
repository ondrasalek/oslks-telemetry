//! WebSocket push of live visitor counts.
//!
//! The socket is reachable from the internet (the reverse proxy forwards `/assets/v1/*` to the
//! collector), so it requires the dashboard's login session: the browser's `oslks_session`
//! cookie is verified here the same way express-session signs it, the session is looked up in
//! `app_sessions`, and each client only receives counts for websites its user may read.

use std::collections::HashSet;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine};
use futures::{sink::SinkExt, stream::StreamExt};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::PgPool;
use tokio::sync::broadcast::error::RecvError;
use uuid::Uuid;

use crate::api::AppState;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VisitorUpdate {
    pub website_id: String,
    pub count: i64,
}

/// Name of the dashboard's session cookie (see dashboard-api `index.ts`).
const SESSION_COOKIE: &str = "oslks_session";

/// How often an open socket re-checks that its session is still valid and refreshes which
/// websites its user can read (membership changes, logout, deleted user, password reset).
const REVALIDATE_EVERY: Duration = Duration::from_secs(60);

/// Decodes `%XX` escapes (cookie values are URL-encoded by express-session).
fn percent_decode(s: &str) -> Option<String> {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = s.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// Extracts the session id from a `Cookie` header, but only if its signature is valid.
///
/// express-session stores `s:<sid>.<sig>` where `sig` is the unpadded base64 of
/// HMAC-SHA256(sid, secret) (the `cookie-signature` format). The comparison is constant-time.
pub fn verified_session_id(cookie_header: &str, secret: &str) -> Option<String> {
    let raw = cookie_header
        .split(';')
        .filter_map(|part| part.trim().split_once('='))
        .find(|(name, _)| *name == SESSION_COOKIE)?
        .1;

    let decoded = percent_decode(raw)?;
    let signed = decoded.strip_prefix("s:")?;
    let (sid, signature) = signed.rsplit_once('.')?;
    let signature = STANDARD_NO_PAD.decode(signature.trim_end_matches('=')).ok()?;

    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(sid.as_bytes());
    mac.verify_slice(&signature).ok()?;

    Some(sid.to_string())
}

/// Which websites a connected user may receive updates for.
#[derive(Debug, PartialEq)]
enum Access {
    /// Superuser: every website.
    All,
    /// Member of the teams that own these websites.
    Sites(HashSet<String>),
}

impl Access {
    fn allows(&self, website_id: &str) -> bool {
        match self {
            Access::All => true,
            Access::Sites(sites) => sites.contains(website_id),
        }
    }
}

/// Resolves a session id to the user's access, or `None` when the session is missing, expired,
/// belongs to a deleted user, or still has a forced password change pending.
async fn authorize(pool: &PgPool, sid: &str) -> Result<Option<Access>, sqlx::Error> {
    let session: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT sess->>'userId', sess->>'mustChangePassword' \
         FROM app_sessions WHERE sid = $1 AND expire > NOW()",
    )
    .bind(sid)
    .fetch_optional(pool)
    .await?;

    let Some((Some(user_id), must_change)) = session else {
        return Ok(None);
    };
    if must_change.as_deref() == Some("true") {
        return Ok(None);
    }
    let Ok(user_id) = Uuid::parse_str(&user_id) else {
        return Ok(None);
    };

    let role: Option<(String,)> = sqlx::query_as("SELECT role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;
    let Some((role,)) = role else {
        return Ok(None);
    };
    if role == "superuser" {
        return Ok(Some(Access::All));
    }

    let sites: Vec<(String,)> = sqlx::query_as(
        "SELECT w.id::text FROM websites w \
         JOIN team_members tm ON tm.team_id = w.team_id \
         WHERE tm.user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(Some(Access::Sites(sites.into_iter().map(|(id,)| id).collect())))
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let sid = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(|cookies| verified_session_id(cookies, &state.config.session_secret));
    let Some(sid) = sid else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    match authorize(&state.pool, &sid).await {
        Ok(Some(access)) => ws.on_upgrade(move |socket| handle_socket(socket, state, sid, access)),
        Ok(None) => StatusCode::UNAUTHORIZED.into_response(),
        Err(e) => {
            tracing::error!("WebSocket auth lookup failed: {}", e);
            StatusCode::SERVICE_UNAVAILABLE.into_response()
        }
    }
}

async fn handle_socket(socket: WebSocket, state: AppState, sid: String, mut access: Access) {
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to the broadcast channel
    let mut rx = state.tx.subscribe();
    let pool = state.pool.clone();

    // Forward only the updates this user may see; periodically re-validate the session.
    let mut send_task = tokio::spawn(async move {
        let mut revalidate = tokio::time::interval(REVALIDATE_EVERY);
        revalidate.tick().await; // the first tick fires immediately

        loop {
            tokio::select! {
                update = rx.recv() => match update {
                    Ok(msg) => {
                        if !access.allows(&msg.website_id) {
                            continue;
                        }
                        let json = serde_json::to_string(&msg).unwrap_or_default();
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                    // A slow client missed some updates; counts are absolute, so just carry on.
                    Err(RecvError::Lagged(_)) => continue,
                    Err(RecvError::Closed) => break,
                },
                _ = revalidate.tick() => match authorize(&pool, &sid).await {
                    Ok(Some(fresh)) => access = fresh,
                    Ok(None) => {
                        let _ = sender.send(Message::Close(None)).await;
                        break;
                    }
                    // Transient DB error: keep the connection and retry next tick.
                    Err(e) => tracing::warn!("WebSocket revalidation failed: {}", e),
                },
            }
        }
    });

    // We don't really expect messages from client for now, but we need to keep the connection open
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Close(_) = msg {
                break;
            }
        }
    });

    // If any one of the tasks exit, abort the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    // Produced by Node's `cookie-signature` (what express-session uses):
    // sign('abc123SESSIONid_-xyz', 'local_dev_secret_key_change_me'), then URL-encoded with "s:".
    const SECRET: &str = "local_dev_secret_key_change_me";
    const SID: &str = "abc123SESSIONid_-xyz";
    const COOKIE: &str =
        "oslks_session=s%3Aabc123SESSIONid_-xyz.r6UDAZm1Hlf6tsJcNcC33OcdxpXstJijQ%2BgLwrDj8zs";

    #[test]
    fn accepts_a_cookie_signed_by_express_session() {
        assert_eq!(verified_session_id(COOKIE, SECRET), Some(SID.to_string()));
    }

    #[test]
    fn finds_the_cookie_among_others() {
        let header = format!("theme=dark; {COOKIE}; other=1");
        assert_eq!(verified_session_id(&header, SECRET), Some(SID.to_string()));
    }

    #[test]
    fn rejects_the_wrong_secret() {
        assert_eq!(verified_session_id(COOKIE, "another-secret"), None);
    }

    #[test]
    fn rejects_a_signature_made_with_another_secret() {
        // sign(SID, 'another-secret') from cookie-signature
        let forged = "oslks_session=s%3Aabc123SESSIONid_-xyz.NFuI0Ho9ILS2ob6UzM2YBr%2Fqew6Htk1gBRlkK0A8TnM";
        assert_eq!(verified_session_id(forged, SECRET), None);
    }

    #[test]
    fn rejects_a_tampered_session_id() {
        let tampered = COOKIE.replace("abc123", "abc124");
        assert_eq!(verified_session_id(&tampered, SECRET), None);
    }

    #[test]
    fn rejects_unsigned_or_malformed_cookies() {
        for header in [
            "",
            "oslks_session=",
            "oslks_session=abc123SESSIONid_-xyz",                    // no "s:" prefix
            "oslks_session=s%3Aabc123SESSIONid_-xyz",                // no signature
            "oslks_session=s%3Aabc.%%%",                             // junk escape + signature
            "oslks_session=s%3Aabc.!!!notbase64!!!",
            "other_cookie=s%3Aabc123SESSIONid_-xyz.r6UDAZm1Hlf6tsJcNcC33OcdxpXstJijQ%2BgLwrDj8zs",
        ] {
            assert_eq!(verified_session_id(header, SECRET), None, "accepted: {header:?}");
        }
    }

    #[test]
    fn access_filters_by_website() {
        let sites = Access::Sites(["a".to_string()].into_iter().collect());
        assert!(sites.allows("a"));
        assert!(!sites.allows("b"));
        assert!(Access::All.allows("anything"));
    }
}
