//! Axum middleware for authentication

use crate::auth::session::get_session_user;
use crate::db::models::SessionUser;
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use tower_sessions::Session;

/// Extractor that requires an authenticated user.
/// If no valid session is found, it returns a 401 Unauthorized response.
pub struct AuthUser(pub SessionUser);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let session = Session::from_request_parts(parts, state)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())?;

        let user = get_session_user(&session).await.ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "error": "Unauthorized"
                })),
            )
                .into_response()
        })?;

        Ok(AuthUser(user))
    }
}
