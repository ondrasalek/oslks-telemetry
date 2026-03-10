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
                device_type, browser, os
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        .bind(&self.device_type)
        .bind(&self.browser)
        .bind(&self.os)
        .execute(pool)
        .await?;

        Ok(())
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

