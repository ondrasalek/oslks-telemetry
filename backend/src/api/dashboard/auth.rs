//! Auth endpoints

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use crate::api::AppState;
use crate::auth::middleware::AuthUser;
use crate::auth::{
    authenticate,
    session::{clear_session, set_session_user},
};
use crate::db::models::SessionUser;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/register", post(register))
        .route("/logout", post(logout))
        .route("/me", get(get_current_user))
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<SessionUser>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

async fn login(
    State(state): State<AppState>,
    session: Session,
    Json(payload): Json<LoginRequest>,
) -> Json<LoginResponse> {
    match authenticate(&payload.email, &payload.password, &state.pool).await {
        Ok(user) => {
            // Store user in session
            if let Err(e) = set_session_user(&session, user.clone()).await {
                let err: tower_sessions::session::Error = e;
                return Json(LoginResponse {
                    success: false,
                    user: None,
                    error: Some(err.to_string()),
                });
            }

            Json(LoginResponse {
                success: true,
                user: Some(user),
                error: None,
            })
        }
        Err(e) => {
            let err: anyhow::Error = e;
            Json(LoginResponse {
                success: false,
                user: None,
                error: Some(err.to_string()),
            })
        },
    }
}

async fn register(
    State(state): State<AppState>,
    session: Session,
    Json(payload): Json<RegisterRequest>,
) -> Json<LoginResponse> {
    // 1. Check if user already exists
    let existing: bool = match sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(&payload.email)
        .fetch_one(&state.pool)
        .await
    {
        Ok(e) => e,
        Err(e) => return Json(LoginResponse { success: false, user: None, error: Some(e.to_string()) }),
    };

    if existing {
        return Json(LoginResponse { success: false, user: None, error: Some("Email already in use".to_string()) });
    }

    // 2. Hash password
    let password_hash = match crate::auth::hash_password(&payload.password) {
        Ok(h) => h,
        Err(e) => return Json(LoginResponse { success: false, user: None, error: Some(e.to_string()) }),
    };

    let user_id = uuid::Uuid::new_v4();

    // 3. Create user
    if let Err(e) = sqlx::query(
        "INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, 'user')"
    )
    .bind(user_id)
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&password_hash)
    .execute(&state.pool)
    .await
    {
        return Json(LoginResponse { success: false, user: None, error: Some(e.to_string()) });
    }

    let user = SessionUser {
        id: user_id,
        email: payload.email,
        name: Some(payload.name),
        role: "user".to_string(),
        team_id: None,
        team_role: None,
    };

    // 4. Set session
    if let Err(e) = set_session_user(&session, user.clone()).await {
        return Json(LoginResponse { success: false, user: None, error: Some(e.to_string()) });
    }

    // 5. Send welcome email (fire and forget/non-blocking)
    let pool = state.pool.clone();
    let email_to = user.email.clone();
    let email_name = user.name.clone().unwrap_or_else(|| "User".to_string());
    tokio::spawn(async move {
        let email_service = crate::utils::email::EmailService::from_db(&pool).await;
        if let Err(e) = email_service.send_welcome_email(&email_to, &email_name).await {
            tracing::error!("Failed to send welcome email: {}", e);
        }
    });

    Json(LoginResponse {
        success: true,
        user: Some(user),
        error: None,
    })
}

async fn logout(session: Session) -> impl axum::response::IntoResponse {
    if let Err(e) = clear_session(&session).await {
        let err: tower_sessions::session::Error = e;
        return Json(serde_json::json!({ "success": false, "error": err.to_string() }));
    }
    Json(serde_json::json!({ "success": true }))
}

async fn get_current_user(AuthUser(user): AuthUser) -> Json<Option<SessionUser>> {
    Json(Some(user))
}
