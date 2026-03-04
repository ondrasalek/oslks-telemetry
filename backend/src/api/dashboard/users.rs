//! Users API endpoints

use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::auth::{
    hash_password,
    middleware::AuthUser,
    permissions::{Action, PermissionEngine, Resource},
};
use crate::db::models::UserInfo;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_users)) // Superuser only
        .route("/", post(create_user)) // Superuser only
        .route("/:id", put(update_user)) // Superuser only (for role/etc)
        .route("/:id", delete(delete_user)) // Superuser only or self
        .route("/:id/profile", put(update_profile)) // Self only (name/email)
        .route("/:id/password", put(update_password)) // Self only
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePasswordRequest {
    pub password: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────

async fn get_users(State(state): State<AppState>, AuthUser(user): AuthUser) -> Json<Vec<UserInfo>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::User, None, &state.pool).await.error_msg().is_some() {
        return Json(Vec::new());
    }

    let users = sqlx::query_as::<_, UserInfo>(
        "SELECT id, name, email, role, current_team_id, created_at FROM users ORDER BY created_at DESC"
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(users)
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: Option<String>,
    pub email: String,
    pub password: Option<String>,
    pub role: String,
}

#[derive(Debug, Serialize)]
pub struct CreateUserResponse {
    pub success: bool,
    pub user: Option<UserInfo>,
    pub error: Option<String>,
}

async fn create_user(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Json<CreateUserResponse> {
    if user.role != "superuser" {
        return Json(CreateUserResponse {
            success: false,
            user: None,
            error: Some("Superuser access required".to_string()),
        });
    }

    let password_hash = match payload.password {
        Some(ref pass) if !pass.is_empty() => match hash_password(pass) {
            Ok(h) => Some(h),
            Err(e) => return Json(CreateUserResponse { success: false, user: None, error: Some(e.to_string()) }),
        },
        _ => None,
    };

    match sqlx::query_as::<_, UserInfo>(
        r#"
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, current_team_id, created_at
        "#
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(&payload.role)
    .fetch_one(&state.pool)
    .await
    {
        Ok(u) => Json(CreateUserResponse { success: true, user: Some(u), error: None }),
        Err(e) => Json(CreateUserResponse { success: false, user: None, error: Some(e.to_string()) }),
    }
}

async fn delete_user(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Delete, Resource::User, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    // Safety check: don't delete the last superuser
    if user.role == "superuser" {
        let is_superuser_row = sqlx::query!("SELECT role FROM users WHERE id = $1", id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

        if is_superuser_row.map(|r| r.role) == Some("superuser".to_string()) {
            let count_row = sqlx::query!("SELECT COUNT(*) as count FROM users WHERE role = 'superuser'")
                .fetch_optional(&state.pool)
                .await
                .unwrap_or(None);

            let current_superusers = count_row.and_then(|r| r.count).unwrap_or(0);

            if current_superusers <= 1 {
                return Json(ActionResponse {
                    success: false,
                    error: Some("Cannot delete the last superuser".to_string()),
                });
            }
        }
    }

    match sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn update_password(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Update, Resource::User, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    let password_hash = match hash_password(&payload.password) {
        Ok(h) => h,
        Err(e) => return Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    };

    match sqlx::query("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
}

async fn update_profile(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Update, Resource::User, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = NOW() WHERE id = $3")
        .bind(payload.name)
        .bind(payload.email)
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn update_user(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> Json<ActionResponse> {
    // Explicitly check for superuser for this endpoint
    if user.role != "superuser" {
        return Json(ActionResponse {
            success: false,
            error: Some("Superuser access required".to_string()),
        });
    }

    match sqlx::query(
        "UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), updated_at = NOW() WHERE id = $4"
    )
    .bind(payload.name)
    .bind(payload.email)
    .bind(payload.role)
    .bind(id)
    .execute(&state.pool)
    .await {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}
