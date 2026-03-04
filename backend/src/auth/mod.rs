//! Authentication and Authorization module

pub mod middleware;
pub mod permissions;
pub mod session;

use crate::db::models::SessionUser;
use bcrypt::verify;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// User record from database query (internal)
#[derive(Debug, FromRow)]
struct UserRow {
    id: Uuid,
    name: Option<String>,
    email: String,
    password: Option<String>,
    role: String,
}

/// Team membership record
#[derive(Debug, FromRow)]
struct TeamMemberRow {
    team_id: Uuid,
    role: String,
}

/// Authenticate a user with email and password
pub async fn authenticate(
    email: &str,
    password: &str,
    pool: &PgPool,
) -> Result<SessionUser, anyhow::Error> {
    // Fetch user by email
    let user: UserRow = sqlx::query_as(
        r#"
        SELECT id, name, email, password, role
        FROM users 
        WHERE email = $1
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;

    // Verify password (bcrypt for compatibility with existing hashes)
    let password_hash = user
        .password
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;

    let password_valid = verify(password, password_hash)
        .map_err(|_| anyhow::anyhow!("Invalid credentials"))?;

    if !password_valid {
        return Err(anyhow::anyhow!("Invalid credentials"));
    }

    // Fetch team membership
    let membership: Option<TeamMemberRow> = sqlx::query_as(
        r#"
        SELECT team_id, role
        FROM team_members
        WHERE user_id = $1
        LIMIT 1
        "#,
    )
    .bind(user.id)
    .fetch_optional(pool)
    .await?;

    Ok(SessionUser {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team_id: membership.as_ref().map(|m| m.team_id),
        team_role: membership.map(|m| m.role),
    })
}

/// Hash a password for storage (using bcrypt for compatibility)
pub fn hash_password(password: &str) -> Result<String, anyhow::Error> {
    bcrypt::hash(password, 10).map_err(|e| anyhow::anyhow!(e.to_string()))
}


