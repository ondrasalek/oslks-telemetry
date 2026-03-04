//! Centralized Authorization System (RBAC)

use crate::db::models::SessionUser;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Action {
    Create,
    Read,
    Update,
    Delete,
    ManageMembers,
    Transfer,
    ResetData,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Resource {
    Website,
    Team,
    User,
    ApiKey,
    SystemSetting,
}

/// The result of a permission check
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionResult {
    Allow,
    Deny(&'static str),
}

impl PermissionResult {


    pub fn error_msg(&self) -> Option<&'static str> {
        match self {
            PermissionResult::Allow => None,
            PermissionResult::Deny(msg) => Some(msg),
        }
    }
}

pub struct PermissionEngine<'a> {
    pub user: &'a SessionUser,
}

impl<'a> PermissionEngine<'a> {
    pub fn new(user: &'a SessionUser) -> Self {
        Self { user }
    }

    /// Check permissions for a specific resource
    pub async fn check(
        &self,
        action: Action,
        resource: Resource,
        resource_id: Option<Uuid>,
        pool: &PgPool,
    ) -> PermissionResult {
        // Superusers can do anything
        if self.user.role == "superuser" {
            return PermissionResult::Allow;
        }

        match resource {
            Resource::Website => self.check_website(action, resource_id, pool).await,
            Resource::Team => self.check_team(action, resource_id, pool).await,
            Resource::User => self.check_user(action, resource_id).await,
            Resource::ApiKey => self.check_api_key(action, resource_id, pool).await,
            Resource::SystemSetting => {
                // Only superusers (handled above) can manage system settings
                PermissionResult::Deny("Superuser access required")
            }
        }
    }

    async fn check_website(
        &self,
        action: Action,
        website_id: Option<Uuid>,
        pool: &PgPool,
    ) -> PermissionResult {
        if action == Action::Create {
            // For creation, website_id is treated as the target team_id
            let team_id = match website_id {
                Some(id) => id,
                None => return PermissionResult::Deny("Team ID required for website creation"),
            };

            let user_role = self.get_team_role(team_id, pool).await;
            return if user_role.is_some() {
                PermissionResult::Allow
            } else {
                PermissionResult::Deny("Must be a member of the team to add websites")
            };
        }

        let website_id = match website_id {
            Some(id) => id,
            None => return PermissionResult::Deny("Website ID required"),
        };

        // Get website's team
        let website_team: Option<(Option<Uuid>,)> = sqlx::query_as("SELECT team_id FROM websites WHERE id = $1")
            .bind(website_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

        let team_id = match website_team {
            Some((Some(id),)) => id,
            _ => return PermissionResult::Deny("Website team not found or unowned"),
        };

        // Check user's role in that team
        let user_role = self.get_team_role(team_id, pool).await;

        match action {
            Action::Read => {
                if user_role.is_some() {
                    PermissionResult::Allow
                } else {
                    PermissionResult::Deny("Not a member of the website's team")
                }
            }
            Action::Update | Action::ResetData => {
                match user_role.as_deref() {
                    Some("owner") | Some("admin") => PermissionResult::Allow,
                    _ => PermissionResult::Deny("Must be an owner or admin to modify website settings"),
                }
            }
            Action::Delete | Action::Transfer => {
                match user_role.as_deref() {
                    Some("owner") => PermissionResult::Allow,
                    _ => PermissionResult::Deny("Only owners can delete or transfer websites"),
                }
            }
            _ => PermissionResult::Deny("Unsupported action for website"),
        }
    }

    async fn check_team(
        &self,
        action: Action,
        team_id: Option<Uuid>,
        pool: &PgPool,
    ) -> PermissionResult {
        let team_id = match team_id {
            Some(id) => id,
            None => return if action == Action::Create { PermissionResult::Allow } else { PermissionResult::Deny("Team ID required") },
        };

        let user_role = self.get_team_role(team_id, pool).await;

        match action {
            Action::Read => {
                if user_role.is_some() {
                    PermissionResult::Allow
                } else {
                    PermissionResult::Deny("Not a member of this team")
                }
            }
            Action::Update | Action::ManageMembers => {
                match user_role.as_deref() {
                    Some("owner") | Some("admin") => PermissionResult::Allow,
                    _ => PermissionResult::Deny("Insufficient permissions in team"),
                }
            }
            Action::Delete => {
                match user_role.as_deref() {
                    Some("owner") => PermissionResult::Allow,
                    _ => PermissionResult::Deny("Only owners can delete teams"),
                }
            }
            _ => PermissionResult::Deny("Unsupported action for team"),
        }
    }

    async fn check_user(&self, action: Action, target_user_id: Option<Uuid>) -> PermissionResult {
        match action {
            Action::Read | Action::Update => {
                if Some(self.user.id) == target_user_id {
                    PermissionResult::Allow
                } else {
                    PermissionResult::Deny("You can only manage your own profile")
                }
            }
            _ => PermissionResult::Deny("User management requires superuser access"),
        }
    }

    async fn check_api_key(
        &self,
        action: Action,
        key_id: Option<Uuid>,
        pool: &PgPool,
    ) -> PermissionResult {
        if action == Action::Create {
            return PermissionResult::Allow;
        }

        let key_id = match key_id {
            Some(id) => id,
            None => return PermissionResult::Deny("API Key ID required"),
        };

        let owner_id: Option<(Uuid,)> = sqlx::query_as("SELECT user_id FROM api_keys WHERE id = $1")
            .bind(key_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

        if owner_id.map(|(id,)| id) == Some(self.user.id) {
            PermissionResult::Allow
        } else {
            PermissionResult::Deny("You don't own this API key")
        }
    }

    pub async fn get_team_role(&self, team_id: Uuid, pool: &PgPool) -> Option<String> {
        // If it's the current team in session, we might already have it
        if Some(team_id) == self.user.team_id {
            return self.user.team_role.clone();
        }

        // Otherwise, fetch from DB
        sqlx::query_as::<sqlx::Postgres, (String,)>("SELECT role FROM team_members WHERE user_id = $1 AND team_id = $2")
            .bind(self.user.id)
            .bind(team_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten()
            .map(|(r,)| r)
    }
}
