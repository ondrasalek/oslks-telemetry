//! API Keys endpoints

use axum::{
    extract::{Path, State},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::auth::{
    middleware::AuthUser,
    permissions::{Action, PermissionEngine, Resource},
};
use crate::db::models::ApiKey;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_api_keys))
        .route("/", post(create_api_key))
        .route("/:id", delete(delete_api_key))
}

#[derive(Debug, Deserialize)]
pub struct CreateKeyRequest {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct CreateKeyResponse {
    pub success: bool,
    pub api_key: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub error: Option<String>,
}

pub fn generate_api_key() -> String {
    use rand::{distributions::Alphanumeric, Rng};
    let key: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    format!("oslks_{}", key)
}

async fn get_api_keys(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Json<Vec<ApiKey>> {
    let keys = sqlx::query_as::<_, ApiKey>(
        "SELECT id, user_id, name, 'HIDDEN' as key, last_used_at, created_at \
         FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(keys)
}

async fn create_api_key(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateKeyRequest>,
) -> Json<CreateKeyResponse> {
    let raw_key = generate_api_key();

    match sqlx::query(
        "INSERT INTO api_keys (user_id, name, key) VALUES ($1, $2, $3)",
    )
    .bind(user.id)
    .bind(&payload.name)
    .bind(&raw_key) // In a real app we'd hash this, but keeping it simple to match frontend port
    .execute(&state.pool)
    .await
    {
        Ok(_) => Json(CreateKeyResponse {
            success: true,
            api_key: Some(raw_key),
            error: None,
        }),
        Err(e) => Json(CreateKeyResponse {
            success: false,
            api_key: None,
            error: Some(e.to_string()),
        }),
    }
}

async fn delete_api_key(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    let result = engine
        .check(Action::Delete, Resource::ApiKey, Some(id), &state.pool)
        .await;

    if let Some(err) = result.error_msg() {
        return Json(ActionResponse {
            success: false,
            error: Some(err.to_string()),
        });
    }

    match sqlx::query("DELETE FROM api_keys WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse {
            success: true,
            error: None,
        }),
        Err(e) => Json(ActionResponse {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}
