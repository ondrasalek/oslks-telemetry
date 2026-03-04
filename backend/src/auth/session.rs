//! Session management for tower-sessions

use crate::db::models::SessionUser;
use tower_sessions::Session;

pub const USER_SESSION_KEY: &str = "user";

/// Get the current session user (if authenticated)
pub async fn get_session_user(session: &Session) -> Option<SessionUser> {
    session
        .get::<SessionUser>(USER_SESSION_KEY)
        .await
        .ok()
        .flatten()
}

/// Set the session user after successful login
pub async fn set_session_user(
    session: &Session,
    user: SessionUser,
) -> Result<(), tower_sessions::session::Error> {
    session.insert(USER_SESSION_KEY, user).await
}

/// Clear the session (logout)
pub async fn clear_session(session: &Session) -> Result<(), tower_sessions::session::Error> {
    session.flush().await
}


