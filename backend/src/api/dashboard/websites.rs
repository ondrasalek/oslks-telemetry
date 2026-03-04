//! Websites API endpoints

use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::auth::{
    middleware::AuthUser,
    permissions::{Action, PermissionEngine, Resource},
};
use crate::db::models::Website;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_websites))
        .route("/", post(add_website))
        .route("/all", get(get_all_websites)) // Superuser only
        .route("/:id", get(get_website))
        .route("/:id", put(update_website))
        .route("/:id", delete(delete_website))
        .route("/:id/toggle-pin", post(toggle_pin))
        .route("/:id/share", put(update_website_share))
        .route("/:id/data", delete(reset_website_data))
        .route("/:id/transfer", post(transfer_website))
        .route("/shared/:share_id", get(get_website_by_share_id))
        .route("/team/:team_id", get(get_team_websites))
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddWebsiteRequest {
    pub domain: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWebsiteRequest {
    pub name: Option<String>,
    pub domain: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateShareRequest {
    pub share_id: Option<String>,
    pub share_config: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub team_id: Uuid,
}

// ── Handlers ──────────────────────────────────────────────────────────────

async fn get_websites(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Json<Vec<Website>> {
    let websites = if let Some(team_id) = user.team_id {
        sqlx::query_as::<_, Website>(
            "SELECT * FROM websites WHERE team_id = $1 ORDER BY is_pinned DESC, created_at DESC"
        )
        .bind(team_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    } else {
        Vec::new()
    };

    Json(websites)
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WebsiteWithTeam {
    pub id: Uuid,
    pub domain: String,
    pub name: Option<String>,
    pub team_id: Option<Uuid>,
    pub team_name: Option<String>,
    pub status: String,
    pub share_id: Option<String>,
    pub is_pinned: bool,
    pub share_config: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

async fn get_all_websites(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Json<Vec<WebsiteWithTeam>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::SystemSetting, None, &state.pool).await.error_msg().is_some() {
        return Json(Vec::new());
    }

    let websites = sqlx::query_as::<_, WebsiteWithTeam>(
        r#"
        SELECT w.id, w.domain, w.name, w.team_id, t.name as team_name,
               w.status, w.share_id, w.is_pinned, w.share_config, w.created_at
        FROM websites w
        LEFT JOIN teams t ON w.team_id = t.id
        ORDER BY w.created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(websites)
}

async fn get_team_websites(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(team_id): Path<Uuid>,
) -> Json<Vec<Website>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Team, Some(team_id), &state.pool).await.error_msg().is_some() {
        return Json(Vec::new());
    }

    let websites = sqlx::query_as::<_, Website>(
        "SELECT * FROM websites WHERE team_id = $1 ORDER BY is_pinned DESC, created_at DESC"
    )
    .bind(team_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(websites)
}

async fn get_website(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<Option<Website>> {
    let engine = PermissionEngine::new(&user);
    if engine.check(Action::Read, Resource::Website, Some(id), &state.pool).await.error_msg().is_some() {
        return Json(None);
    }

    let website = sqlx::query_as::<_, Website>("SELECT * FROM websites WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or_default();

    Json(website)
}

async fn get_website_by_share_id(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
) -> Json<Option<Website>> {
    let website = sqlx::query_as::<_, Website>("SELECT * FROM websites WHERE share_id = $1")
        .bind(share_id)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or_default();
    Json(website)
}

async fn add_website(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<AddWebsiteRequest>,
) -> Json<Result<Website, String>> {
    let team_id = match user.team_id {
        Some(id) => id,
        None => return Json(Err("No active team".to_string())),
    };

    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Create, Resource::Website, Some(team_id), &state.pool).await.error_msg() {
        return Json(Err(err.to_string()));
    }

    // Fetch title and favicon
    let domain = payload.domain.trim().to_lowercase();
    let mut name = payload.name;
    let icon_url = if !domain.is_empty() {
        let metadata = crate::utils::fetch_website_metadata(&domain).await;
        
        // If user didn't provide a name, use the fetched `<title>`
        if name.as_deref().unwrap_or("").trim().is_empty() {
            if let Some(mut fetched_title) = metadata.title {
                // Truncate to reasonable length
                fetched_title.truncate(100);
                name = Some(fetched_title);
            }
        }
        
        metadata.icon_url
    } else {
        None
    };

    match sqlx::query_as::<_, Website>(
        "INSERT INTO websites (domain, name, team_id, status, icon_url) \
         VALUES ($1, $2, $3, 'active', $4) RETURNING *"
    )
    .bind(&domain)
    .bind(&name)
    .bind(team_id)
    .bind(icon_url)
    .fetch_one(&state.pool)
    .await
    {
        Ok(site) => Json(Ok(site)),
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("websites_domain_key") {
                Json(Err("This domain is already registered. If you own this domain, please contact support to claim it.".to_string()))
            } else {
                Json(Err(err_str))
            }
        }
    }
}

async fn update_website(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateWebsiteRequest>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Update, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("UPDATE websites SET name = COALESCE($1, name), domain = COALESCE($2, domain), updated_at = NOW() WHERE id = $3")
        .bind(&payload.name)
        .bind(&payload.domain)
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn delete_website(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Delete, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("DELETE FROM websites WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn toggle_pin(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Read, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("UPDATE websites SET is_pinned = NOT is_pinned WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn update_website_share(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateShareRequest>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::Update, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("UPDATE websites SET share_id = $1, share_config = COALESCE($2, share_config), updated_at = NOW() WHERE id = $3")
        .bind(&payload.share_id)
        .bind(&payload.share_config)
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("websites_share_id_key") {
                Json(ActionResponse { success: false, error: Some("This share ID is already taken".to_string()) })
            } else {
                Json(ActionResponse { success: false, error: Some(err_str) })
            }
        }
    }
}

async fn reset_website_data(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    if let Some(err) = engine.check(Action::ResetData, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }

    match sqlx::query("DELETE FROM events WHERE website_id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}

async fn transfer_website(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<TransferRequest>,
) -> Json<ActionResponse> {
    let engine = PermissionEngine::new(&user);
    // 1. Check if user can transfer from current team
    if let Some(err) = engine.check(Action::Transfer, Resource::Website, Some(id), &state.pool).await.error_msg() {
        return Json(ActionResponse { success: false, error: Some(err.to_string()) });
    }
    // 2. Check if user holds team_id in target team (usually verified, doing basic check)
    let role = engine.get_team_role(payload.team_id, &state.pool).await;
    if role.is_none() {
        return Json(ActionResponse { success: false, error: Some("Not a member of target team".to_string()) });
    }

    match sqlx::query("UPDATE websites SET team_id = $1, updated_at = NOW() WHERE id = $2")
        .bind(&payload.team_id)
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => Json(ActionResponse { success: true, error: None }),
        Err(e) => Json(ActionResponse { success: false, error: Some(e.to_string()) }),
    }
}
