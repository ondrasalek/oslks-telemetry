use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::env;

pub struct EmailService {
    transport: Option<SmtpTransport>,
    from: String,
    app_url: String,
}

impl EmailService {
    pub fn new() -> Self {
        let host = env::var("SMTP_HOST").unwrap_or_default();
        let port = env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse::<u16>().unwrap_or(587);
        let user = env::var("SMTP_USER").unwrap_or_default();
        let password = env::var("SMTP_PASSWORD").unwrap_or_default();
        let from = env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| env::var("SMTP_FROM").unwrap_or_else(|_| "no-reply@example.com".to_string()));
        let app_url = env::var("APP_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

        if host.is_empty() {
            tracing::warn!("SMTP_HOST not set, email notifications will be disabled");
            return Self { transport: None, from, app_url };
        }

        let creds = Credentials::new(user, password);
        
        use lettre::transport::smtp::client::{Tls, TlsParameters};

        let maybe_transport = if port == 465 {
            SmtpTransport::relay(&host).map(|b| {
                b.port(465)
                    .tls(Tls::Wrapper(TlsParameters::new(host.clone()).unwrap()))
                    .credentials(creds.clone())
                    .build()
            })
        } else {
            SmtpTransport::starttls_relay(&host).map(|b| {
                b.port(port)
                    .credentials(creds.clone())
                    .build()
            })
        };

        let transport = match maybe_transport {
            Ok(t) => Some(t),
            Err(e) => {
                tracing::error!("Failed to build SMTP transport: {}", e);
                None
            }
        };

        Self {
            transport,
            from,
            app_url,
        }
    }

    pub async fn from_db(pool: &sqlx::PgPool) -> Self {
        let smtp_setting: Option<crate::db::models::SystemSetting> = 
            sqlx::query_as("SELECT key, value FROM system_settings WHERE key = 'smtp'")
                .fetch_optional(pool)
                .await
                .unwrap_or(None);

        let general_setting: Option<crate::db::models::SystemSetting> = 
            sqlx::query_as("SELECT key, value FROM system_settings WHERE key = 'general'")
                .fetch_optional(pool)
                .await
                .unwrap_or(None);
        
        let db_app_url = general_setting.and_then(|gs| gs.value["app_url"].as_str().map(|s| s.to_string()));
        let app_url = db_app_url.unwrap_or_else(|| env::var("APP_URL").unwrap_or_else(|_| "http://localhost:5173".to_string()));

        if let Some(setting) = smtp_setting {
            let val = setting.value;
            let host = val["host"].as_str().unwrap_or("").to_string();
            let port = val["port"].as_i64().unwrap_or(587) as u16;
            let user = val["username"].as_str().unwrap_or("").to_string();
            let password = val["password"].as_str().unwrap_or("").to_string();
            let from = val["from_email"].as_str().unwrap_or("").to_string();
            let from_name = val["from_name"].as_str().unwrap_or("OSLKS Telemetry").to_string();

            if !host.is_empty() {
                let creds = Credentials::new(user, password);
                
                use lettre::transport::smtp::client::{Tls, TlsParameters};

                let maybe_transport = if port == 465 {
                    SmtpTransport::relay(&host).map(|b| {
                        b.port(465)
                            .tls(Tls::Wrapper(TlsParameters::new(host.clone()).unwrap()))
                            .credentials(creds.clone())
                            .build()
                    })
                } else {
                    SmtpTransport::starttls_relay(&host).map(|b| {
                        b.port(port)
                            .credentials(creds.clone())
                            .build()
                    })
                };

                let transport = match maybe_transport {
                    Ok(t) => Some(t),
                    Err(e) => {
                        tracing::error!("Failed to build SMTP transport from DB config: {}", e);
                        None
                    }
                };

                return Self { transport, from: if from.is_empty() { "no-reply@example.com".to_string() } else { format!("{} <{}>", from_name, from) }, app_url };
            }
        }

        // Fallback to env variants 
        let mut service = Self::new();
        service.app_url = app_url;
        service
    }

    pub async fn send_welcome_email(&self, to_email: &str, user_name: &str) -> Result<(), anyhow::Error> {
        if self.transport.is_none() {
            return Ok(());
        }

        let email = Message::builder()
            .from(self.from.parse().unwrap())
            .to(to_email.parse().unwrap())
            .subject("Welcome to OSLKS Radar!")
            .body(format!(
                "Hello {},\n\nYour OSLKS Radar instance has been successfully installed.\n\nYou can now log in at {}\n\nHappy tracking!\n\nThe OSLKS Team",
                user_name, self.app_url
            ))?;

        self.transport.as_ref().unwrap().send(&email)?;
        Ok(())
    }

    pub async fn send_team_invite_email(&self, to_email: &str, team_name: &str, invite_token: &str) -> Result<(), anyhow::Error> {
        if self.transport.is_none() {
            tracing::info!("Mock Email: Invite to {} for team {} with token {}", to_email, team_name, invite_token);
            return Ok(());
        }

        let invite_link = format!("{}/invite/accept?token={}", self.app_url, invite_token);

        let email = Message::builder()
            .from(self.from.parse().unwrap())
            .to(to_email.parse().unwrap())
            .subject(format!("You've been invited to join {} on OSLKS Radar", team_name))
            .body(format!(
                "Hello,\n\nYou have been invited to join the team '{}' on OSLKS Radar.\n\nPlease click the following link to accept your invitation:\n{}\n\nIf you don't have an account, you will be able to create one.\n\nHappy tracking!\n\nThe OSLKS Team",
                team_name, invite_link
            ))?;

        self.transport.as_ref().unwrap().send(&email)?;
        Ok(())
    }
}
