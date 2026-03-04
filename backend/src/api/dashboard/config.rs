//! Global configuration endpoints

use axum::{routing::get, extract::State, Json, Router};
use serde::Serialize;
use crate::api::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/env", get(get_env_config))
        // /app-url is no longer as relevant with a unified proxy, but let's keep it
        .route("/app-url", get(get_app_url))
        .route("/collector-url", get(get_collector_url))
}

#[derive(Serialize)]
pub struct EnvConfigResponse {
    pub smtp_enabled: bool,
}

async fn get_env_config(State(state): State<AppState>) -> Json<EnvConfigResponse> {
    let smtp_setting: Option<crate::db::models::SystemSetting> = 
        sqlx::query_as("SELECT key, value FROM system_settings WHERE key = 'smtp'")
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let mut is_enabled = false;
    if let Some(setting) = smtp_setting {
        if let Some(host) = setting.value["host"].as_str() {
            if !host.is_empty() {
                is_enabled = true;
            }
        }
    }

    if !is_enabled {
        let env_host = std::env::var("SMTP_HOST").unwrap_or_default();
        is_enabled = !env_host.is_empty();
    }

    Json(EnvConfigResponse {
        smtp_enabled: is_enabled,
    })
}

// In the new proxy architecture, both URLs are the same as origin
async fn get_app_url() -> Json<String> {
    Json("".to_string())
}

async fn get_collector_url() -> Json<String> {
    Json("".to_string())
}
