//! Settings API endpoints

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::auth::{
    middleware::AuthUser,
    permissions::{Action, PermissionEngine, Resource},
};
use crate::db::models::SystemSetting;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:key", get(get_setting))
        .route("/:key", post(save_setting))
        .route("/test-email", post(send_test_email))
}

#[derive(Debug, Serialize)]
pub struct SettingResponse {
    pub success: bool,
    pub setting: Option<SystemSetting>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveSettingRequest {
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub error: Option<String>,
}

// Helper to check permissions
async fn check_settings_permission(
    user: &crate::db::models::SessionUser,
    action: Action,
    pool: &sqlx::PgPool,
) -> Result<(), String> {
    let engine = PermissionEngine::new(user);
    let result = engine
        .check(action, Resource::SystemSetting, None, pool)
        .await;

    if let Some(err) = result.error_msg() {
        return Err(err.to_string());
    }
    Ok(())
}

async fn get_setting(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(key): Path<String>,
) -> Json<SettingResponse> {
    if let Err(e) = check_settings_permission(&user, Action::Read, &state.pool).await {
        return Json(SettingResponse {
            success: false,
            setting: None,
            error: Some(e),
        });
    }

    match sqlx::query_as::<_, SystemSetting>("SELECT key, value FROM system_settings WHERE key = $1")
        .bind(&key)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(setting) => {
            let final_setting = setting;

            // Inject defaults for 'general' if missing
            if key == "general" {
                let mut val = match final_setting.as_ref() {
                    Some(s) => s.value.clone(),
                    None => serde_json::json!({}),
                };

                if val["app_url"].as_str().is_none() {
                    let default_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("app_url".to_string(), serde_json::Value::String(default_url));
                    }
                }

                return Json(SettingResponse {
                    success: true,
                    setting: Some(SystemSetting {
                        key: "general".to_string(),
                        value: val,
                    }),
                    error: None,
                });
            }

            Json(SettingResponse {
                success: true,
                setting: final_setting,
                error: None,
            })
        },
        Err(e) => Json(SettingResponse {
            success: false,
            setting: None,
            error: Some(e.to_string()),
        }),
    }
}

async fn save_setting(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(key): Path<String>,
    Json(payload): Json<SaveSettingRequest>,
) -> Json<ActionResponse> {
    if let Err(e) = check_settings_permission(&user, Action::Update, &state.pool).await {
        return Json(ActionResponse {
            success: false,
            error: Some(e),
        });
    }

    match sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
    )
    .bind(&key)
    .bind(&payload.value)
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

async fn send_test_email(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Json<ActionResponse> {
    if let Err(e) = check_settings_permission(&user, Action::Update, &state.pool).await {
        return Json(ActionResponse {
            success: false,
            error: Some(e),
        });
    }

    // 1. Load SMTP settings from DB
    let smtp_setting: Option<SystemSetting> =
        sqlx::query_as("SELECT key, value FROM system_settings WHERE key = 'smtp'")
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let smtp_val = match smtp_setting {
        Some(s) => s.value,
        None => {
            return Json(ActionResponse {
                success: false,
                error: Some("SMTP settings not found in database.".to_string()),
            })
        }
    };

    let host = smtp_val["host"].as_str().unwrap_or("").to_string();
    let port = smtp_val["port"].as_i64().unwrap_or(587) as u16;
    let username = smtp_val["username"].as_str().unwrap_or("").to_string();
    let password = smtp_val["password"].as_str().unwrap_or("").to_string();
    let from_email = smtp_val["from_email"].as_str().unwrap_or("").to_string();
    let from_name = smtp_val["from_name"].as_str().unwrap_or("OSLKS Telemetry").to_string();

    if host.is_empty() || username.is_empty() || from_email.is_empty() {
        return Json(ActionResponse {
            success: false,
            error: Some("Incomplete SMTP settings.".to_string()),
        });
    }

    // 2. Build email and send
    use lettre::{
        message::header::ContentType, transport::smtp::authentication::Credentials, Message,
        SmtpTransport, Transport,
    };

    let to_email = user.email.clone();

    let email = match Message::builder()
        .from(format!("{} <{}>", from_name, from_email).parse().unwrap())
        .to(to_email.parse().unwrap())
        .subject("OSLKS-Telemetry: SMTP Configuration Test")
        .header(ContentType::TEXT_PLAIN)
        .body(String::from(
            "Hello,\n\nIf you are reading this, your SMTP configuration is working correctly!\n\nBest,\nOSLKS-Telemetry Team"
        )) {
            Ok(m) => m,
            Err(e) => return Json(ActionResponse { success: false, error: Some(e.to_string()) }),
        };

    let creds = Credentials::new(username, password);

    use lettre::transport::smtp::client::{Tls, TlsParameters};

    let maybe_transport = if port == 465 {
        SmtpTransport::relay(&host)
            .map(|b| {
                b.port(465)
                    .tls(Tls::Wrapper(TlsParameters::new(host.clone()).unwrap()))
                    .credentials(creds.clone())
                    .build()
            })
    } else {
        SmtpTransport::starttls_relay(&host)
            .map(|b| {
                b.port(port)
                    .credentials(creds.clone())
                    .build()
            })
    };

    let mailer = match maybe_transport {
        Ok(m) => m,
        Err(e) => {
            return Json(ActionResponse {
                success: false,
                error: Some(format!("Failed to build SMTP transport: {}", e)),
            })
        }
    };

    match mailer.send(&email) {
        Ok(_) => Json(ActionResponse {
            success: true,
            error: None,
        }),
        Err(e) => Json(ActionResponse {
            success: false,
            error: Some(format!("Failed to send email: {}", e)),
        }),
    }
}
