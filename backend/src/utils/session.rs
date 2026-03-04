//! Cookie-less session tracking for OSLKS Telemetry
//!
//! Generates unique session IDs without using cookies, based on:
//! - Client IP address
//! - User-Agent string
//! - Website ID
//! - Daily rotating salt
//!
//! This approach is privacy-friendly as it:
//! - Doesn't store any cookies
//! - Session IDs rotate daily (at midnight UTC)
//! - Cannot be used to track users across different websites
//! - Cannot be reversed to obtain original data

use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use uuid::Uuid;

/// Generate a daily salt based on the current date and secret
///
/// The salt changes at midnight UTC, ensuring sessions are unique per day.
fn generate_daily_salt(secret: &str, date: DateTime<Utc>) -> String {
    let date_str = date.format("%Y-%m-%d").to_string();
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(date_str.as_bytes());
    hex::encode(hasher.finalize())
}

/// Generate a unique session ID for cookie-less tracking
///
/// # Algorithm
/// ```text
/// session_id = SHA256(ip + user_agent + website_id + daily_salt)
/// ```
///
/// # Arguments
/// * `ip` - Client IP address
/// * `user_agent` - Client User-Agent header
/// * `website_id` - UUID of the website being tracked
/// * `secret` - Server secret for salt generation
///
/// # Returns
/// A 64-character hexadecimal string representing the session ID
pub fn generate_session_id(
    ip: &str,
    user_agent: &str,
    website_id: &Uuid,
    secret: &str,
) -> String {
    generate_session_id_with_time(ip, user_agent, website_id, secret, Utc::now())
}

/// Generate session ID with a specific timestamp (for testing)
pub fn generate_session_id_with_time(
    ip: &str,
    user_agent: &str,
    website_id: &Uuid,
    secret: &str,
    timestamp: DateTime<Utc>,
) -> String {
    let daily_salt = generate_daily_salt(secret, timestamp);

    let mut hasher = Sha256::new();
    hasher.update(ip.as_bytes());
    hasher.update(user_agent.as_bytes());
    hasher.update(website_id.as_bytes());
    hasher.update(daily_salt.as_bytes());

    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_session_id_consistency() {
        let ip = "192.168.1.1";
        let user_agent = "Mozilla/5.0";
        let website_id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        let secret = "test-secret";
        let timestamp = Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap();

        let session1 = generate_session_id_with_time(ip, user_agent, &website_id, secret, timestamp);
        let session2 = generate_session_id_with_time(ip, user_agent, &website_id, secret, timestamp);

        assert_eq!(session1, session2);
        assert_eq!(session1.len(), 64); // SHA256 hex = 64 chars
    }

    #[test]
    fn test_session_id_changes_daily() {
        let ip = "192.168.1.1";
        let user_agent = "Mozilla/5.0";
        let website_id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        let secret = "test-secret";

        let day1 = Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap();
        let day2 = Utc.with_ymd_and_hms(2024, 1, 16, 12, 0, 0).unwrap();

        let session_day1 = generate_session_id_with_time(ip, user_agent, &website_id, secret, day1);
        let session_day2 = generate_session_id_with_time(ip, user_agent, &website_id, secret, day2);

        assert_ne!(session_day1, session_day2);
    }

    #[test]
    fn test_different_inputs_different_sessions() {
        let website_id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        let secret = "test-secret";
        let timestamp = Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap();

        let session1 = generate_session_id_with_time(
            "192.168.1.1",
            "Mozilla/5.0",
            &website_id,
            secret,
            timestamp,
        );
        let session2 = generate_session_id_with_time(
            "192.168.1.2", // Different IP
            "Mozilla/5.0",
            &website_id,
            secret,
            timestamp,
        );

        assert_ne!(session1, session2);
    }
}
