//! Database models for OSLKS Telemetry
//!
//! Defines the data structures that map to database tables.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Website entity - represents a tracked website
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Website {
    pub id: Uuid,
    pub domain: String,
    pub name: Option<String>,
    pub icon_url: Option<String>,
    pub team_id: Option<Uuid>,
    pub status: Option<String>,
    pub is_pinned: bool,
    pub share_id: Option<String>,
    pub share_config: Option<serde_json::Value>,
    pub last_ping_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Event entity - represents a telemetry event
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct Event {
    pub id: Uuid,
    pub website_id: Uuid,
    pub session_id: String,
    pub url: String,
    pub referrer: Option<String>,
    pub event_type: String,
    pub event_name: Option<String>,
    pub event_data: Option<serde_json::Value>,
    pub user_agent: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f32>,
    pub longitude: Option<f32>,
    pub device_type: Option<String>,
    pub browser: Option<String>,
    pub os: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// DTO for creating a new event
#[derive(Debug, Clone)]
pub struct CreateEvent {
    pub website_id: Uuid,
    pub session_id: String,
    pub url: String,
    pub referrer: Option<String>,
    pub event_type: String,
    pub event_name: Option<String>,
    pub event_data: Option<serde_json::Value>,
    pub user_agent: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f32>,
    pub longitude: Option<f32>,
    pub device_type: Option<String>,
    pub browser: Option<String>,
    pub os: Option<String>,
}

impl CreateEvent {
    /// Insert this event into the database
    pub async fn insert(&self, pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO events (
                website_id, session_id, url, referrer, event_type,
                event_name, event_data, user_agent, country, city,
                latitude, longitude, device_type, browser, os
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            "#,
        )
        .bind(&self.website_id)
        .bind(&self.session_id)
        .bind(&self.url)
        .bind(&self.referrer)
        .bind(&self.event_type)
        .bind(&self.event_name)
        .bind(&self.event_data)
        .bind(&self.user_agent)
        .bind(&self.country)
        .bind(&self.city)
        .bind(self.latitude)
        .bind(self.longitude)
        .bind(&self.device_type)
        .bind(&self.browser)
        .bind(&self.os)
        .execute(pool)
        .await?;

        // Fan the visit out to live dashboards. Best-effort: a failed notify must never
        // fail event collection.
        if let Err(e) = sqlx::query("SELECT pg_notify($1, $2)")
            .bind(LIVE_CHANNEL)
            .bind(self.live_payload())
            .execute(pool)
            .await
        {
            tracing::debug!("live notify failed: {}", e);
        }

        Ok(())
    }

    /// JSON sent to the live feed. Deliberately carries no session id, IP, user agent or
    /// referrer: just what the dashboard shows (where, which page, when).
    fn live_payload(&self) -> String {
        serde_json::json!({
            "website_id": self.website_id,
            "type": self.event_type,
            "name": self.event_name.as_deref().map(|n| truncate(n, 100)),
            "url": truncate(&self.url, 500),
            "country": self.country,
            "city": self.city,
            "lat": self.latitude,
            "lng": self.longitude,
            "at": Utc::now().to_rfc3339(),
        })
        .to_string()
    }
}

/// First `max` characters, so user-controlled strings can't blow the NOTIFY size limit.
fn truncate(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

/// Postgres NOTIFY channel the dashboard API listens on for live visits.
pub const LIVE_CHANNEL: &str = "radar_events";

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> CreateEvent {
        CreateEvent {
            website_id: Uuid::nil(),
            session_id: "secret-session".into(),
            url: "/pricing".into(),
            referrer: Some("https://secret.example/".into()),
            event_type: "pageview".into(),
            event_name: None,
            event_data: Some(serde_json::json!({"private": true})),
            user_agent: Some("Mozilla/secret".into()),
            country: Some("CZ".into()),
            city: Some("Prague".into()),
            latitude: Some(50.08),
            longitude: Some(14.42),
            device_type: None,
            browser: None,
            os: None,
        }
    }

    #[test]
    fn live_payload_has_only_display_fields() {
        let v: serde_json::Value = serde_json::from_str(&sample().live_payload()).unwrap();
        assert_eq!(v["url"], "/pricing");
        assert_eq!(v["country"], "CZ");
        assert_eq!(v["city"], "Prague");
        assert!(v["at"].is_string());
        let raw = sample().live_payload();
        for leaked in ["secret-session", "secret.example", "Mozilla", "private"] {
            assert!(!raw.contains(leaked), "payload leaked {leaked}");
        }
    }

    #[test]
    fn live_payload_fits_notify_limit() {
        // Postgres rejects NOTIFY payloads of 8000 bytes or more.
        let mut e = sample();
        e.url = "/".to_string() + &"a".repeat(20_000);
        e.event_name = Some("n".repeat(20_000));
        assert!(e.live_payload().len() < 8000);
    }
}

/// Check if a website exists by ID
#[allow(dead_code)]
pub async fn website_exists(pool: &sqlx::PgPool, website_id: Uuid) -> Result<bool, sqlx::Error> {
    let result: Option<(i32,)> = sqlx::query_as("SELECT 1 FROM websites WHERE id = $1")
        .bind(website_id)
        .fetch_optional(pool)
        .await?;

    Ok(result.is_some())
}

/// Get website by domain
#[allow(dead_code)]
pub async fn get_website_by_domain(
    pool: &sqlx::PgPool,
    domain: &str,
) -> Result<Option<Website>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM websites WHERE domain = $1")
        .bind(domain)
        .fetch_optional(pool)
        .await
}

/// Create a new website
#[allow(dead_code)]
pub async fn create_website(
    pool: &sqlx::PgPool,
    domain: &str,
    name: Option<&str>,
) -> Result<Website, sqlx::Error> {
    sqlx::query_as(
        r#"
        INSERT INTO websites (domain, name)
        VALUES ($1, $2)
        RETURNING *
        "#,
    )
    .bind(domain)
    .bind(name)
    .fetch_one(pool)
    .await
}

/// Team entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct Team {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub icon_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Team Member entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct TeamMember {
    pub team_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

/// User entity (basic view)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct User {
    pub id: Uuid,
    pub name: Option<String>,
    pub email: String,
    pub current_team_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

