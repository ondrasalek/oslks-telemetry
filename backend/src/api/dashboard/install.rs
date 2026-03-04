//! Installation logic: checks if system has any superusers set up.

use axum::{
    extract::{State, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::auth::hash_password;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/check", get(check_installed))
        .route("/setup", post(install_system))
}

#[derive(Debug, Serialize)]
pub struct CheckResponse {
    pub installed: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InstallRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct InstallResponse {
    pub success: bool,
    pub error: Option<String>,
}

async fn check_installed(State(state): State<AppState>) -> Json<CheckResponse> {
    match sqlx::query!("SELECT EXISTS(SELECT 1 FROM users WHERE role = 'superuser') as installed")
        .fetch_one(&state.pool)
        .await
    {
        Ok(record) => Json(CheckResponse {
            installed: record.installed.unwrap_or(false),
            error: None,
        }),
        Err(e) => Json(CheckResponse {
            installed: false,
            error: Some(e.to_string()),
        }),
    }
}

async fn install_system(
    State(state): State<AppState>,
    Json(payload): Json<InstallRequest>,
) -> Json<InstallResponse> {
    // 1. Check again (security)
    let installed = match sqlx::query!("SELECT EXISTS(SELECT 1 FROM users WHERE role = 'superuser') as installed")
        .fetch_one(&state.pool)
        .await
    {
        Ok(record) => record.installed.unwrap_or(false),
        Err(e) => {
            return Json(InstallResponse {
                success: false,
                error: Some(e.to_string()),
            });
        }
    };

    if installed {
        return Json(InstallResponse {
            success: false,
            error: Some("System is already installed".to_string()),
        });
    }

    // 2. Create the first user
    let password_hash = match hash_password(&payload.password) {
        Ok(h) => h,
        Err(e) => {
            return Json(InstallResponse {
                success: false,
                error: Some(e.to_string()),
            });
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return Json(InstallResponse {
                success: false,
                error: Some(e.to_string()),
            });
        }
    };

    // 2. Create the first user
    let user_id = uuid::Uuid::new_v4();
    match sqlx::query(
        "INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, 'superuser')",
    )
    .bind(user_id)
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(&password_hash)
    .execute(&mut *tx)
    .await
    {
        Ok(_) => (),
        Err(e) => {
            return Json(InstallResponse {
                success: false,
                error: Some(e.to_string()),
            });
        }
    };

    // 3. Create a default team
    let team_id = uuid::Uuid::new_v4();
    let team_name = format!("{}'s Team", payload.name);
    let slug = format!("{}-{}", payload.name.to_lowercase().replace(' ', "-"), &user_id.to_string()[..5]);

    if let Err(e) = sqlx::query(
        "INSERT INTO teams (id, name, slug) VALUES ($1, $2, $3)",
    )
    .bind(team_id)
    .bind(&team_name)
    .bind(&slug)
    .execute(&mut *tx)
    .await {
        return Json(InstallResponse {
            success: false,
            error: Some(e.to_string()),
        });
    }

    // 4. Add user as owner of the team
    if let Err(e) = sqlx::query(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')",
    )
    .bind(team_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await {
        return Json(InstallResponse {
            success: false,
            error: Some(e.to_string()),
        });
    }

    // 5. Update user with current_team_id
    if let Err(e) = sqlx::query(
        "UPDATE users SET current_team_id = $1 WHERE id = $2",
    )
    .bind(team_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await {
        return Json(InstallResponse {
            success: false,
            error: Some(e.to_string()),
        });
    }

    // 6. Commit transaction
    if let Err(e) = tx.commit().await {
        return Json(InstallResponse {
            success: false,
            error: Some(e.to_string()),
        });
    }

    // 7. Send welcome email (fire and forget/non-blocking)
    let email_to = payload.email.clone();
    let email_name = payload.name.clone();
    tokio::spawn(async move {
        let email_service = crate::utils::EmailService::new();
        if let Err(e) = email_service.send_welcome_email(&email_to, &email_name).await {
            tracing::error!("Failed to send welcome email: {}", e);
        }
    });

    Json(InstallResponse {
        success: true,
        error: None,
    })
}
