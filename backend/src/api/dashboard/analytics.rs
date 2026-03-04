//! Analytics API endpoints

use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::AppState;
use crate::auth::{
    middleware::AuthUser,
    permissions::{Action, PermissionEngine, Resource},
};
use crate::db::models::{ChartDataPoint, MetricData, Stats};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:website_id/stats", get(get_stats))
        .route("/:website_id/metrics", get(get_metrics))
        .route("/:website_id/chart", get(get_chart_data))
        .route("/:website_id/active", get(get_active_visitors))
        .route("/team/:team_id/stats", get(get_team_stats))
        // Public shared routes
        .route("/shared/:share_id/stats", get(get_shared_stats))
        .route("/shared/:share_id/metrics", get(get_shared_metrics))
        .route("/shared/:share_id/chart", get(get_shared_chart_data))
        .route("/shared/:share_id/active", get(get_shared_active_visitors))
}

#[derive(Debug, Deserialize)]
pub struct DateRangeQuery {
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub url: Option<String>,
    pub referrer: Option<String>,
    pub os: Option<String>,
    pub browser: Option<String>,
    pub device: Option<String>,
    pub country: Option<String>,
    pub event_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MetricsQuery {
    #[serde(flatten)]
    pub filters: DateRangeQuery,
    pub metric_type: String, // e.g., "url", "referrer", "os", "browser", "device", "country", "event_name"
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct ChartQuery {
    #[serde(flatten)]
    pub filters: DateRangeQuery,
    pub interval: String, // e.g., "minute", "hour", "day", "month"
}

// ── Handlers ──────────────────────────────────────────────────────────────

async fn get_stats(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(website_id): Path<Uuid>,
    Query(query): Query<DateRangeQuery>,
) -> Json<Option<Stats>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Website, Some(website_id), &state.pool).await.error_msg().is_some() {
        return Json(None);
    }

    // Build the query dynamically based on filters
    let mut sql = String::from(
        "SELECT \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as pageviews, \
            0::float as bounce_rate, \
            0::float as average_duration \
         FROM events \
         WHERE website_id = $1"
    );

    let mut bindings = 1;
    let mut params = Vec::new();

    if let Some(start) = query.start_at {
        bindings += 1;
        sql.push_str(&format!(" AND created_at >= ${}", bindings));
        params.push(start.to_rfc3339()); // simplified for example
    }
    
    // In a real implementation this would use a query builder like squinel or raw query bindings
    // For brevity of this port, doing a basic hardcoded fetch simulating it
    let stats = sqlx::query_as::<_, Stats>(
        "SELECT \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as pageviews, \
            COUNT(*) as visits, \
            0::float as bounce_rate, \
            0::float as avg_duration \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10)"
    )
    .bind(website_id)
    .bind(query.start_at)
    .bind(query.end_at)
    .bind(query.url)
    .bind(query.referrer)
    .bind(query.os)
    .bind(query.browser)
    .bind(query.device)
    .bind(query.country)
    .bind(query.event_name)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    Json(stats)
}

async fn get_metrics(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(website_id): Path<Uuid>,
    Query(query): Query<MetricsQuery>,
) -> Json<Vec<MetricData>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Website, Some(website_id), &state.pool).await.error_msg().is_some() {
        return Json(Vec::new());
    }

    let limit = query.limit.unwrap_or(10) as i64;

    // A pattern for dynamic column grouping securely
    let allowed_columns = ["url", "referrer", "os", "browser", "device_type", "country", "event_name"];
    
    if !allowed_columns.contains(&query.metric_type.as_str()) {
        return Json(Vec::new());
    }
    
    let group_col = query.metric_type.as_str();

    let sql = format!(
        "SELECT \
            COALESCE({col}, 'Unknown') as value, \
            COUNT(*) as count \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10) \
         GROUP BY {col} \
         ORDER BY count DESC \
         LIMIT $11", col = group_col
    );

    let metrics = sqlx::query_as::<_, MetricData>(&sql)
        .bind(website_id)
        .bind(query.filters.start_at)
        .bind(query.filters.end_at)
        .bind(query.filters.url)
        .bind(query.filters.referrer)
        .bind(query.filters.os)
        .bind(query.filters.browser)
        .bind(query.filters.device)
        .bind(query.filters.country)
        .bind(query.filters.event_name)
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(metrics)
}

async fn get_chart_data(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(website_id): Path<Uuid>,
    Query(query): Query<ChartQuery>,
) -> Json<Vec<ChartDataPoint>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Website, Some(website_id), &state.pool).await.error_msg().is_some() {
        return Json(Vec::new());
    }

    let interval_sql = match query.interval.as_str() {
        "minute" => "date_trunc('minute', created_at)",
        "hour" => "date_trunc('hour', created_at)",
        "day" => "date_trunc('day', created_at)",
        "month" => "date_trunc('month', created_at)",
        _ => "date_trunc('day', created_at)", // Default to day
    };

    let sql = format!(
        "SELECT \
            {} as timestamp, \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as views \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10) \
         GROUP BY timestamp \
         ORDER BY timestamp ASC", interval_sql
    );

    let chart_data = sqlx::query_as::<_, ChartDataPoint>(&sql)
        .bind(website_id)
        .bind(query.filters.start_at)
        .bind(query.filters.end_at)
        .bind(query.filters.url)
        .bind(query.filters.referrer)
        .bind(query.filters.os)
        .bind(query.filters.browser)
        .bind(query.filters.device)
        .bind(query.filters.country)
        .bind(query.filters.event_name)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(chart_data)
}

async fn get_active_visitors(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(website_id): Path<Uuid>,
) -> Json<i64> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Website, Some(website_id), &state.pool).await.error_msg().is_some() {
        return Json(0);
    }

    let count_row = sqlx::query!(
        "SELECT COUNT(DISTINCT session_id) as count FROM events \
         WHERE website_id = $1 AND created_at >= NOW() - INTERVAL '5 minutes'",
        website_id
    )
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let current_active = count_row.and_then(|r| r.count).unwrap_or(0);

    Json(current_active)
}

async fn get_team_stats(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(team_id): Path<Uuid>,
    Query(query): Query<DateRangeQuery>,
) -> Json<Option<Stats>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Team, Some(team_id), &state.pool).await.error_msg().is_some() {
        return Json(None);
    }

    let stats = sqlx::query_as::<_, Stats>(
        "SELECT \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as pageviews, \
            COUNT(*) as visits, \
            0::float as bounce_rate, \
            0::float as avg_duration \
         FROM events e \
         JOIN websites w ON e.website_id = w.id \
         WHERE w.team_id = $1 \
           AND ($2::timestamptz IS NULL OR e.created_at >= $2) \
           AND ($3::timestamptz IS NULL OR e.created_at <= $3)"
    )
    .bind(team_id)
    .bind(query.start_at)
    .bind(query.end_at)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    Json(stats)
}

// ── Public Shared Handlers ────────────────────────────────────────────────

async fn get_shared_website_info(pool: &sqlx::PgPool, share_id: &str) -> Option<(Uuid, serde_json::Value)> {
    let result = sqlx::query!(
        "SELECT id, share_config FROM websites WHERE share_id = $1", 
        share_id
    )
    .fetch_optional(pool)
    .await
    .unwrap_or(None)?;

    Some((result.id, result.share_config.unwrap_or_else(|| serde_json::json!({}))))
}

fn is_shared_feature_enabled(config: &serde_json::Value, feature: &str) -> bool {
    // If config has no keys (or is null), default to true for backwards compatibility
    // Otherwise check if the specific feature is strictly true
    if config.as_object().map_or(true, |obj| obj.is_empty()) {
        true
    } else {
        config.get(feature).and_then(|v| v.as_bool()).unwrap_or(false)
    }
}

async fn get_shared_stats(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
    Query(query): Query<DateRangeQuery>,
) -> Json<Option<Stats>> {
    let (website_id, config) = match get_shared_website_info(&state.pool, &share_id).await {
        Some(info) => info,
        None => return Json(None),
    };

    // Stats covers the overview numbers like pageviews, visitors, bounce rate
    if !is_shared_feature_enabled(&config, "stats") {
        return Json(None);
    }

    let stats = sqlx::query_as::<_, Stats>(
        "SELECT \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as pageviews, \
            COUNT(*) as visits, \
            0::float as bounce_rate, \
            0::float as avg_duration \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10)"
    )
    .bind(website_id)
    .bind(query.start_at)
    .bind(query.end_at)
    .bind(query.url)
    .bind(query.referrer)
    .bind(query.os)
    .bind(query.browser)
    .bind(query.device)
    .bind(query.country)
    .bind(query.event_name)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    Json(stats)
}

async fn get_shared_metrics(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
    Query(query): Query<MetricsQuery>,
) -> Json<Vec<MetricData>> {
    let limit = query.limit.unwrap_or(10) as i64;
    let allowed_columns = ["url", "referrer", "os", "browser", "device_type", "country", "event_name"];
    
    if !allowed_columns.contains(&query.metric_type.as_str()) {
        return Json(Vec::new());
    }
    
    let (website_id, config) = match get_shared_website_info(&state.pool, &share_id).await {
        Some(info) => info,
        None => return Json(Vec::new()),
    };

    // Metrics refer to detailed breakdowns (pages, sources, os, devices, countries)
    let metric_feature = match query.metric_type.as_str() {
        "url" => "pages",
        "referrer" => "sources",
        "os" | "browser" | "device_type" => "environment",
        "country" => "geography",
        _ => "stats",
    };

    if !is_shared_feature_enabled(&config, metric_feature) {
        return Json(Vec::new());
    }

    let group_col = query.metric_type.as_str();

    let sql = format!(
        "SELECT \
            COALESCE({col}, 'Unknown') as value, \
            COUNT(*) as count \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10) \
           GROUP BY {col} \
           ORDER BY count DESC \
           LIMIT $11", col = group_col
    );

    let metrics = sqlx::query_as::<_, MetricData>(&sql)
        .bind(website_id)
        .bind(query.filters.start_at)
        .bind(query.filters.end_at)
        .bind(query.filters.url)
        .bind(query.filters.referrer)
        .bind(query.filters.os)
        .bind(query.filters.browser)
        .bind(query.filters.device)
        .bind(query.filters.country)
        .bind(query.filters.event_name)
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(metrics)
}

async fn get_shared_chart_data(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
    Query(query): Query<ChartQuery>,
) -> Json<Vec<ChartDataPoint>> {
    let (website_id, config) = match get_shared_website_info(&state.pool, &share_id).await {
        Some(info) => info,
        None => return Json(Vec::new()),
    };

    // Chart refers to the main Activity graph
    if !is_shared_feature_enabled(&config, "graph") {
        return Json(Vec::new());
    }

    let interval_sql = match query.interval.as_str() {
        "minute" => "date_trunc('minute', created_at)",
        "hour" => "date_trunc('hour', created_at)",
        "day" => "date_trunc('day', created_at)",
        "month" => "date_trunc('month', created_at)",
        _ => "date_trunc('day', created_at)",
    };

    let sql = format!(
        "SELECT \
            {} as timestamp, \
            COUNT(DISTINCT session_id) as visitors, \
            COUNT(*) as views \
         FROM events \
         WHERE website_id = $1 \
           AND ($2::timestamptz IS NULL OR created_at >= $2) \
           AND ($3::timestamptz IS NULL OR created_at <= $3) \
           AND ($4::text IS NULL OR url = $4) \
           AND ($5::text IS NULL OR referrer = $5) \
           AND ($6::text IS NULL OR os = $6) \
           AND ($7::text IS NULL OR browser = $7) \
           AND ($8::text IS NULL OR device_type = $8) \
           AND ($9::text IS NULL OR country = $9) \
           AND ($10::text IS NULL OR event_name = $10) \
         GROUP BY timestamp \
         ORDER BY timestamp ASC", interval_sql
    );

    let chart_data = sqlx::query_as::<_, ChartDataPoint>(&sql)
        .bind(website_id)
        .bind(query.filters.start_at)
        .bind(query.filters.end_at)
        .bind(query.filters.url)
        .bind(query.filters.referrer)
        .bind(query.filters.os)
        .bind(query.filters.browser)
        .bind(query.filters.device)
        .bind(query.filters.country)
        .bind(query.filters.event_name)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(chart_data)
}

async fn get_shared_active_visitors(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
) -> Json<i64> {
    let (website_id, config) = match get_shared_website_info(&state.pool, &share_id).await {
        Some(info) => info,
        None => return Json(0),
    };

    // Active visitors can be bundled with the stats feature
    if !is_shared_feature_enabled(&config, "stats") {
        return Json(0);
    }

    let count_row = sqlx::query!(
        "SELECT COUNT(DISTINCT session_id) as count FROM events \
         WHERE website_id = $1 AND created_at >= NOW() - INTERVAL '5 minutes'",
        website_id
    )
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let current_active = count_row.and_then(|r| r.count).unwrap_or(0);

    Json(current_active)
}
