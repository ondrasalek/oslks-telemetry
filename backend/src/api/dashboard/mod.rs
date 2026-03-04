//! Dashboard API router module

use axum::Router;
use tower_sessions::{cookie::time::Duration, Expiry, SessionManagerLayer};
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
        
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(!cfg!(debug_assertions)) // Secure in release, false in dev
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(Duration::days(7)));

    // Background task to clean up expired sessions
    /*
    tokio::task::spawn(
        session_store
            .clone()
            .continuously_delete_expired(tokio::time::Duration::from_secs(60 * 60)),
    );
    */

    Router::new()
        .nest("/auth", auth::router())
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
