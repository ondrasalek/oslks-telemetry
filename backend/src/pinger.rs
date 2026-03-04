//! Website health check pinger for OSLKS Telemetry
//!
//! Periodically pings tracked websites to check their status and update uptime data.

use std::time::Duration;
use sqlx::PgPool;
use tracing::{info, error, debug};
use reqwest::Client;

pub async fn start_pinger(pool: PgPool) {
    info!("Starting website status pinger");
    let mut interval = tokio::time::interval(Duration::from_secs(300)); // Check every 5 minutes

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("OSLKS-Telemetry-Pinger/1.0")
        .build()
        .expect("Failed to build HTTP client for pinger");

    loop {
        interval.tick().await;
        debug!("Running website status check");
        if let Err(e) = check_websites(&pool, &client).await {
            error!("Error checking websites: {}", e);
        }
    }
}

async fn check_websites(pool: &PgPool, client: &Client) -> Result<(), sqlx::Error> {
    // Fetch all active websites
    let websites = sqlx::query!("SELECT id, domain FROM websites")
        .fetch_all(pool)
        .await?;

    for website in websites {
        let url = format!("https://{}", website.domain);
        
        let status = match client.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    "online"
                } else {
                    "offline"
                }
            }
            Err(e) => {
                debug!("Ping failed for {}: {}", url, e);
                "offline"
            }
        };

        sqlx::query!(
            "UPDATE websites SET status = $1, last_ping_at = NOW(), updated_at = NOW() WHERE id = $2",
            status,
            website.id
        )
        .execute(pool)
        .await?;
        
        debug!("Website {} status: {}", website.domain, status);
    }

    Ok(())
}
