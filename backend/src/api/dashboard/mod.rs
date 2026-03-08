//! Dashboard API router module

use axum::Router;
use tower_sessions::{cookie::time::Duration, ExpiredDeletion, Expiry, SessionManagerLayer};
use tower_sessions_sqlx_store::PostgresStore;
use sqlx::PgPool;

pub mod auth;
pub mod analytics;
pub mod websites;
pub mod teams;
pub mod users;
pub mod settings;
pub mod api_keys;
pub mod install;
pub mod config;

/// Build the dashboard API router
pub fn router(pool: PgPool) -> Router<crate::api::AppState> {
    // Session layer (requires 'sessions' table in Postgres space)
    let session_store = PostgresStore::new(pool);
        
    // Environment-aware session security
    // Default to true (secure) except when explicitly disabled for HTTP environments
    let secure_cookies = std::env::var("SESSION_COOKIE_INSECURE")
        .map(|v| v != "true")
        .unwrap_or(true); 

    tracing::info!(
        "Initializing SessionManagerLayer: secure={}, same_site=Lax, expiry=7 days",
        secure_cookies
    );

    let session_layer = SessionManagerLayer::new(session_store.clone())
        .with_secure(secure_cookies)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(Duration::days(7)));

    // Background task to clean up expired sessions
    tokio::task::spawn(
        session_store
            .clone()
            .continuously_delete_expired(tokio::time::Duration::from_secs(60 * 60)),
    );

    Router::new()
        .nest("/v1/sso/auth", auth::router())
        .nest("/analytics", analytics::router())
        .nest("/websites", websites::router())
        .nest("/teams", teams::router())
        .nest("/users", users::router())
        .nest("/settings", settings::router())
        .nest("/api_keys", api_keys::router())
        .nest("/install", install::router())
        .nest("/config", config::router())
        .layer(session_layer)
}
