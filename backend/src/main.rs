//! OSLKS Telemetry - High-Performance Analytics Collector
//!
//! A privacy-friendly, cookie-less telemetry backend built with Rust and TimescaleDB.

use anyhow::{Context, Result};
use axum::{
    http::{header, HeaderValue, Method},
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    normalize_path::NormalizePathLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod auth;
mod config;
mod db;
mod domain_cache;
mod utils;
mod pinger;

use crate::utils::GeoIpReader;
// FIX: Explicitly import get_script
use api::{collect, health, health_detailed, get_script, ws::ws_handler, AppState};
use config::Config;

/// Build CORS layer based on configuration
fn build_cors_layer(config: &Config) -> CorsLayer {
    // FIX: Comprehensive list of allowed headers.
    // When allow_credentials(true) is used, wildcard '*' is strictly forbidden.
    // Added ORIGIN and common tracking headers.
    let allowed_headers = [
        header::CONTENT_TYPE,
        header::AUTHORIZATION,
        header::ACCEPT,
        header::ORIGIN,
        header::USER_AGENT,
        header::HeaderName::from_static("x-requested-with"),
    ];

    let allowed_methods = [Method::GET, Method::POST, Method::OPTIONS];

    match &config.cors_allowed_origins {
        Some(origins) if !origins.is_empty() => {
            tracing::info!("CORS: Whitelist mode. Allowed origins: {:?}", origins);
            let allowed_origins: Vec<HeaderValue> = origins
                .iter()
                .filter_map(|origin| origin.parse().ok())
                .collect();

            CorsLayer::new()
                .allow_origin(allowed_origins)
                .allow_methods(allowed_methods)
                .allow_headers(allowed_headers)
                .allow_credentials(true)
        }
        _ => {
            // DYNAMICKÝ REŽIM (Mirror)
            tracing::info!("CORS: Dynamic mode (Mirror). Allowing request origin dynamically with credentials.");

            CorsLayer::new()
                .allow_origin(AllowOrigin::mirror_request())
                .allow_methods(allowed_methods)
                .allow_headers(allowed_headers)
                .allow_credentials(true)
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "oslks_telemetry=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Collector");

    // Load configuration
    let config = Config::from_env().context("Failed to load configuration")?;
    tracing::info!("Configuration loaded");

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await
        .context("Failed to connect to database")?;

    tracing::info!("Connected to database");

    // Run migrations
    tracing::info!("Running database migrations");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("Failed to run database migrations")?;

    tracing::info!("Migrations completed");

    // Sync SMTP config from environment if present
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_default();
    if !smtp_host.is_empty() {
        let port = std::env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse::<u16>().unwrap_or(587);
        let username = std::env::var("SMTP_USER").unwrap_or_default();
        let password = std::env::var("SMTP_PASSWORD").unwrap_or_default();
        let from_email = std::env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| std::env::var("SMTP_FROM").unwrap_or_else(|_| "no-reply@example.com".to_string()));
        let from_name = std::env::var("SMTP_FROM_NAME").unwrap_or_else(|_| "OSLKS Telemetry".to_string());
        
        let smtp_json = serde_json::json!({
            "host": smtp_host,
            "port": port,
            "username": username,
            "password": password,
            "from_email": from_email,
            "from_name": from_name
        });

        match sqlx::query(
            "INSERT INTO system_settings (key, value, created_at, updated_at) VALUES ('smtp', $1, NOW(), NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
        )
        .bind(&smtp_json)
        .execute(&pool)
        .await {
            Ok(_) => tracing::info!("Synced SMTP settings from environment variables to database"),
            Err(e) => tracing::warn!("Failed to sync SMTP settings to database: {}", e),
        }
    }

    // Initialize domain cache (O(1) origin validation, no per-event DB queries)
    let domain_cache = Arc::new(domain_cache::DomainCache::new(
        10_000, // max 10k websites in cache
        300,    // 5 minute TTL per entry
    ));
    domain_cache
        .warm(&pool)
        .await
        .context("Failed to warm domain cache")?;

    // Start background cache refresh worker (every 5 minutes)
    domain_cache::start_cache_refresh_worker(
        Arc::clone(&domain_cache),
        pool.clone(),
        Duration::from_secs(300),
    );

    // Configure CORS based on environment
    let cors = build_cors_layer(&config);

    // Initialize GeoIP reader if path is provided
    let geoip_reader = if let Some(path) = &config.geoip_db_path {
        match GeoIpReader::open(path) {
            Ok(reader) => {
                tracing::info!("GeoIP database loaded from {}", path);
                Some(Arc::new(reader))
            }
            Err(e) => {
                tracing::warn!("Failed to load GeoIP database: {}. Analytics will continue without country info.", e);
                None
            }
        }
    } else {
        tracing::info!("GeoIP database path not configured. Analytics will continue without country info.");
        None
    };

    // Start background pinger
    let pinger_pool = pool.clone();

    // Create broadcast channel for WebSocket updates
    let (tx, _rx) = broadcast::channel(100);

    // Build dashboard router before pool is moved into state
    let dashboard_router = crate::api::dashboard::router(pool.clone());

    // Create shared application state
    let state = AppState {
        pool,
        config: Arc::new(config.clone()),
        geoip_reader,
        domain_cache,
        tx,
    };

    tokio::spawn(async move {
        pinger::start_pinger(pinger_pool).await;
    });

    // Build the router with state
    let app = Router::new()
        // Collector endpoint (direct + stealth)
        .route("/v1/p", post(collect))
        .route("/assets/v1/v1/p", post(collect))
        // WebSocket endpoint
        .route("/ws", get(ws_handler))
        // Script serving (direct + stealth)
        .route("/lib/j", get(get_script))
        .route("/assets/v1/lib/j", get(get_script))
        // Health check endpoints (consolidating under /api for dashboard)
        .route("/health", get(health))
        .route("/api/health", get(health_detailed))
        // Dashboard API routes
        .nest("/api", dashboard_router)
        // Add middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        // Add state
        .with_state(state)
        // Normalize paths (fixes 404s on trailing slashes) - must be the OUTERMOST layer
        .layer(NormalizePathLayer::trim_trailing_slash());

    // Parse bind address
    let addr: SocketAddr = config
        .bind_address()
        .parse()
        .context("Invalid bind address")?;

    tracing::info!("Server listening on http://{}", addr);

    // Start the server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .context("Server error")?;

    Ok(())
}