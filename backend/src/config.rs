//! Configuration module for OSLKS Telemetry
//!
//! Loads configuration from environment variables using dotenvy.

use anyhow::{Context, Result};
use std::env;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    /// PostgreSQL connection string
    pub database_url: String,
    /// Server bind host (e.g., "0.0.0.0")
    pub host: String,
    /// Server bind port
    pub port: u16,
    /// Secret key for session ID generation
    pub session_secret: String,
    /// CORS allowed origins (comma-separated)
    pub cors_allowed_origins: Option<Vec<String>>,
    /// Path to GeoIP database file (.mmdb)
    pub geoip_db_path: Option<String>,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Errors
    /// Returns error if required environment variables are missing
    pub fn from_env() -> Result<Self> {
        // Load .env file if present (ignored in production)
        dotenvy::dotenv().ok();

        let cors_origins = env::var("CORS_ALLOWED_ORIGINS").ok().map(|origins| {
            origins
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        });

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL environment variable is required")?,
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .context("PORT must be a valid number")?,
            session_secret: env::var("SESSION_SECRET")
                .context("SESSION_SECRET environment variable is required")?,
            cors_allowed_origins: cors_origins,
            geoip_db_path: env::var("GEOIP_DB_PATH").ok().filter(|s| !s.is_empty()),
        })
    }

    /// Get the full server bind address
    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
