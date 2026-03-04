//! HTTP handlers for OSLKS Telemetry
//!
//! Implements the collector endpoint and other API routes.

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::api::{ApiError, ws::VisitorUpdate};
use crate::config::Config;
use crate::db::CreateEvent;
use crate::domain_cache::DomainCache;
use crate::utils::{
    detect_browser, detect_device_type, detect_os, generate_session_id, is_bot,
    GeoIpReader,
};

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
    pub geoip_reader: Option<Arc<GeoIpReader>>,
    pub domain_cache: Arc<DomainCache>,
    pub tx: broadcast::Sender<VisitorUpdate>,
}

/// Payload for the collect endpoint
#[derive(Debug, Deserialize)]
pub struct CollectPayload {
    /// Website ID (required)
    pub website_id: Uuid,
    /// Page URL (required)
    pub url: String,
    /// Referrer URL (optional)
    pub referrer: Option<String>,
    /// Event type (defaults to "pageview")
    #[serde(default = "default_event_type")]
    pub event_type: String,
    /// Custom event name (optional)
    pub event_name: Option<String>,
    /// Custom event data (optional)
    pub event_data: Option<serde_json::Value>,
}

fn default_event_type() -> String {
    "pageview".to_string()
}

/// Response for successful collection
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct CollectResponse {
    pub success: bool,
}

/// Extract client IP from headers or connection info
fn extract_client_ip(headers: &HeaderMap, addr: &SocketAddr) -> String {
    // Check forwarded headers (for reverse proxy setups)
    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(value) = forwarded.to_str() {
            // X-Forwarded-For can contain multiple IPs, take the first
            if let Some(ip) = value.split(',').next() {
                return ip.trim().to_string();
            }
        }
    }

    // Check CF-Connecting-IP (Cloudflare)
    if let Some(cf_ip) = headers.get("cf-connecting-ip") {
        if let Ok(value) = cf_ip.to_str() {
            return value.to_string();
        }
    }

    // Check X-Real-IP
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(value) = real_ip.to_str() {
            return value.to_string();
        }
    }

    // Fall back to connection address
    addr.ip().to_string()
}

/// Extract User-Agent from headers
fn extract_user_agent(headers: &HeaderMap) -> String {
    headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

/// Extract the request origin from `Origin` header, falling back to `Referer`.
///
/// Returns `None` if neither header is present (e.g., server-side requests).
fn extract_origin(headers: &HeaderMap) -> Option<String> {
    // Prefer Origin header (set by browsers on cross-origin requests)
    if let Some(origin) = headers.get("origin") {
        if let Ok(value) = origin.to_str() {
            if !value.is_empty() && value != "null" {
                return Some(value.to_string());
            }
        }
    }

    // Fall back to Referer header
    if let Some(referer) = headers.get("referer") {
        if let Ok(value) = referer.to_str() {
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }

    None
}

/// POST /v1/p
///
/// Collects telemetry events from websites.
///
/// # Validation Flow
/// 1. Filter bots by User-Agent
/// 2. Extract Origin/Referer header
/// 3. O(1) in-memory cache lookup: validate website_id exists AND origin matches domain
/// 4. If validation fails → 403 Forbidden (no DB hit, no event processing)
///
/// # Request
/// - Headers: User-Agent, Origin or Referer, X-Forwarded-For (optional)
/// - Body: JSON with website_id, url, referrer (optional), event_type, event_name, event_data
///
/// # Response
/// - 204 No Content on success
/// - 400 Bad Request if payload is invalid
/// - 403 Forbidden if origin validation fails
#[axum::debug_handler]
pub async fn collect(
    State(state): State<AppState>,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<CollectPayload>,
) -> Result<StatusCode, ApiError> {
    let user_agent = extract_user_agent(&headers);

    // Filter out bots
    if is_bot(&user_agent) {
        tracing::debug!("Filtered bot request: {}", user_agent);
        // Return success to not reveal bot detection
        return Ok(StatusCode::NO_CONTENT);
    }

    // --- Origin validation (O(1) cache lookup, no DB hit) ---
    let origin = extract_origin(&headers);

    match origin {
        Some(ref origin_str) => {
            // Validate website_id exists in cache AND origin matches the domain
            if let Err(e) = state
                .domain_cache
                .validate_origin(&payload.website_id, origin_str)
                .await
            {
                tracing::warn!(
                    "Origin validation rejected: website_id={}, origin='{}', reason={}",
                    payload.website_id,
                    origin_str,
                    e
                );
                return Err(ApiError::OriginForbidden(
                    "Forbidden".to_string(),
                ));
            }
        }
        None => {
            // No Origin/Referer header — still validate that the website_id exists
            // (server-side requests, sendBeacon, curl, etc. may omit origin)
            if state.domain_cache.get(&payload.website_id).await.is_none() {
                tracing::warn!(
                    "Unknown website_id={} (no origin header)",
                    payload.website_id
                );
                return Err(ApiError::OriginForbidden(
                    "Forbidden".to_string(),
                ));
            }
        }
    }

    // Extract client info
    let client_ip = extract_client_ip(&headers, &addr);

    // Generate cookie-less session ID
    let session_id = generate_session_id(
        &client_ip,
        &user_agent,
        &payload.website_id,
        &state.config.session_secret,
    );

    // Detect device info from User-Agent
    let device_type = detect_device_type(&user_agent).to_string();
    let browser = detect_browser(&user_agent).to_string();
    let os = detect_os(&user_agent).to_string();

    // Detect country and city using GeoIP
    let (country, city) = state
        .geoip_reader
        .as_ref()
        .map(|reader| reader.lookup(&client_ip))
        .unwrap_or((None, None));

    // Create event
    let event = CreateEvent {
        website_id: payload.website_id,
        session_id,
        url: payload.url,
        referrer: payload.referrer,
        event_type: payload.event_type,
        event_name: payload.event_name,
        event_data: payload.event_data,
        user_agent: Some(user_agent),
        country,
        city,
        device_type: Some(device_type),
        browser: Some(browser),
        os: Some(os),
    };

    // Insert event asynchronously
    event.insert(&state.pool).await?;

    tracing::debug!(
        "Collected event for website {} session {}",
        payload.website_id,
        event.session_id
    );

    // Calculate active visitors (last 5 minutes)
    // We spawn this to not block the response
    let pool = state.pool.clone();
    let tx = state.tx.clone();
    let website_id = payload.website_id;
    
    tokio::spawn(async move {
        let result: Result<(i64,), sqlx::Error> = sqlx::query_as(
            r#"
            SELECT COUNT(DISTINCT session_id)
            FROM events
            WHERE website_id = $1
            AND created_at > NOW() - INTERVAL '5 minutes'
            "#
        )
        .bind(website_id)
        .fetch_one(&pool)
        .await;

        if let Ok((count,)) = result {
            let update = VisitorUpdate {
                website_id: website_id.to_string(),
                count,
            };
            let _ = tx.send(update);
        }
    });

    Ok(StatusCode::NO_CONTENT)
}

/// GET /health
///
/// Health check endpoint for load balancers and monitoring.
pub async fn health() -> StatusCode {
    StatusCode::OK
}

/// GET /api/health
///
/// Detailed health check with database connectivity.
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub database: bool,
}

pub async fn health_detailed(State(state): State<AppState>) -> Json<HealthResponse> {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.pool)
        .await
        .is_ok();

    Json(HealthResponse {
        status: if db_ok { "healthy" } else { "degraded" },
        database: db_ok,
    })
}

/// GET /script.js
///
/// Serves the client-side tracking script.
pub async fn get_script() -> impl axum::response::IntoResponse {
    let script = include_str!("../tracker/script.js");
    
    (
        [(
            axum::http::header::CONTENT_TYPE,
            "text/javascript; charset=utf-8",
        ),
        (
            axum::http::header::CACHE_CONTROL,
            "public, max-age=3600",
        )],
        script,
    )
}
