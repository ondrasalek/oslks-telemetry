//! In-memory domain cache for high-throughput origin validation.
//!
//! Maps website_id (UUID) → domain (String) using a moka async cache.
//! Eliminates per-event database queries for website existence checks.

use moka::future::Cache;
use sqlx::PgPool;
use std::collections::HashSet;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use uuid::Uuid;

/// High-performance, thread-safe domain cache.
///
/// Backed by `moka::future::Cache` which provides:
/// - Bounded capacity with LRU eviction
/// - Time-based expiration (TTL)
/// - Lock-free concurrent reads
#[derive(Clone)]
pub struct DomainCache {
    inner: Cache<Uuid, String>,
    /// Normalized hosts (lowercase, no scheme/port/`www.`) of all registered
    /// websites. Kept in a sync set so the CORS layer can consult it from a
    /// non-async predicate.
    hosts: Arc<RwLock<HashSet<String>>>,
}

impl DomainCache {
    /// Create a new domain cache.
    ///
    /// - `max_capacity`: Maximum number of entries (websites) to cache.
    /// - `ttl_seconds`: Time-to-live for each entry in seconds.
    pub fn new(max_capacity: u64, ttl_seconds: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_live(Duration::from_secs(ttl_seconds))
            .build();

        Self {
            inner: cache,
            hosts: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    /// Warm the cache by loading all websites from the database.
    ///
    /// Should be called once at startup before serving traffic.
    pub async fn warm(&self, pool: &PgPool) -> Result<usize, sqlx::Error> {
        let rows: Vec<(Uuid, String)> =
            sqlx::query_as("SELECT id, domain FROM websites")
                .fetch_all(pool)
                .await?;

        let count = rows.len();
        self.replace_hosts(rows.iter().map(|(_, d)| d.as_str()));
        for (id, domain) in rows {
            self.inner.insert(id, domain).await;
        }

        tracing::info!("Domain cache warmed with {} websites", count);
        Ok(count)
    }

    /// Refresh the entire cache from the database.
    ///
    /// This is called periodically by the background worker.
    /// New entries are inserted/updated; stale entries expire via TTL.
    async fn refresh(&self, pool: &PgPool) -> Result<usize, sqlx::Error> {
        let rows: Vec<(Uuid, String)> =
            sqlx::query_as("SELECT id, domain FROM websites")
                .fetch_all(pool)
                .await?;

        let count = rows.len();
        self.replace_hosts(rows.iter().map(|(_, d)| d.as_str()));
        for (id, domain) in rows {
            self.inner.insert(id, domain).await;
        }

        tracing::debug!("Domain cache refreshed with {} websites", count);
        Ok(count)
    }

    fn replace_hosts<'a>(&self, domains: impl Iterator<Item = &'a str>) {
        let set: HashSet<String> = domains.filter_map(normalize_host).collect();
        if let Ok(mut guard) = self.hosts.write() {
            *guard = set;
        }
    }

    /// Sync check used by the CORS layer: is `origin` the apex, `www.` or any
    /// subdomain of a registered website's domain?
    ///
    /// Only http(s) origins are considered. Unknown origins are denied, so the
    /// browser blocks the preflight for sites that are not registered.
    pub fn is_registered_origin(&self, origin: &str) -> bool {
        if !(origin.starts_with("https://") || origin.starts_with("http://")) {
            return false;
        }
        let Some(host) = normalize_host(origin) else {
            return false;
        };
        let Ok(hosts) = self.hosts.read() else {
            return false;
        };
        // Walk up the labels: a.b.example.com -> b.example.com -> example.com
        let mut candidate = host.as_str();
        loop {
            if hosts.contains(candidate) {
                return true;
            }
            match candidate.split_once('.') {
                Some((_, rest)) if rest.contains('.') => candidate = rest,
                _ => return false,
            }
        }
    }

    /// O(1) lookup: get the cached domain for a website_id.
    pub async fn get(&self, website_id: &Uuid) -> Option<String> {
        self.inner.get(website_id).await
    }

    /// Validate that a request origin matches the cached domain for a website.
    ///
    /// Returns `Ok(())` if valid, or `Err(reason)` if the request should be rejected.
    ///
    /// Matching rules:
    /// - The origin's host must exactly match the cached domain, OR
    /// - The origin's host must be a subdomain of the cached domain
    ///   (e.g., origin `https://blog.example.com` matches domain `example.com`)
    pub async fn validate_origin(
        &self,
        website_id: &Uuid,
        origin: &str,
    ) -> Result<(), OriginError> {
        let cached_domain_raw = self
            .get(website_id)
            .await
            .ok_or(OriginError::UnknownWebsite)?;

        // Normalize BOTH sides: extract host from origin AND cached domain
        // (cached domain may be stored as "https://slks.cz" or "slks.cz")
        let origin_host = extract_host(origin);
        let domain_host = extract_host(&cached_domain_raw);

        // Strip leading "www." for comparison
        let origin_normalized = origin_host.strip_prefix("www.").unwrap_or(origin_host);
        let domain_normalized = domain_host.strip_prefix("www.").unwrap_or(domain_host);

        // Exact match
        if origin_normalized.eq_ignore_ascii_case(domain_normalized) {
            return Ok(());
        }

        // --- Local development relaxation ---
        // Allow localhost and 127.0.0.1 origins to match any website during development
        if origin_normalized == "localhost" || origin_normalized == "127.0.0.1" || origin_normalized == "[::1]" {
            tracing::debug!("Localhost origin allowed for website={}", website_id);
            return Ok(());
        }

        // Subdomain match: origin ends with ".{domain}"
        let subdomain_suffix = format!(".{}", domain_normalized.to_ascii_lowercase());
        if origin_normalized
            .to_ascii_lowercase()
            .ends_with(&subdomain_suffix)
        {
            return Ok(());
        }

        tracing::warn!(
            "Origin validation failed: website={}, origin='{}' (host='{}'), cached_domain='{}' (host='{}')",
            website_id, origin, origin_host, cached_domain_raw, domain_host
        );

        Err(OriginError::DomainMismatch {
            expected: cached_domain_raw,
            got: origin_host.to_string(),
        })
    }
}

/// Errors from origin validation.
#[derive(Debug)]
pub enum OriginError {
    /// The website_id was not found in the cache.
    UnknownWebsite,
    /// The request origin doesn't match the website's domain.
    DomainMismatch { expected: String, got: String },
}

impl std::fmt::Display for OriginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OriginError::UnknownWebsite => write!(f, "Unknown website"),
            OriginError::DomainMismatch { expected, got } => {
                write!(f, "Origin '{}' does not match domain '{}'", got, expected)
            }
        }
    }
}

/// Lowercased host without scheme, port or leading `www.`; `None` if empty.
fn normalize_host(raw: &str) -> Option<String> {
    let host = extract_host(raw.trim()).to_ascii_lowercase();
    let host = host.strip_prefix("www.").unwrap_or(&host);
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

/// Extract the host portion from an origin or URL string.
///
/// Examples:
/// - `"https://example.com"` → `"example.com"`
/// - `"https://example.com:443"` → `"example.com"`
/// - `"https://blog.example.com/path"` → `"blog.example.com"`
/// - `"example.com"` → `"example.com"` (no scheme)
fn extract_host(origin: &str) -> &str {
    let without_scheme = origin
        .strip_prefix("https://")
        .or_else(|| origin.strip_prefix("http://"))
        .unwrap_or(origin);

    // Strip path
    let without_path = without_scheme.split('/').next().unwrap_or(without_scheme);

    // Strip port
    // Handle IPv6 addresses like [::1]:8080
    if without_path.starts_with('[') {
        // IPv6: find the closing bracket, then strip port after it
        without_path
            .find(']')
            .map(|i| &without_path[..=i])
            .unwrap_or(without_path)
    } else {
        without_path
            .rsplit_once(':')
            .map(|(host, _port)| host)
            .unwrap_or(without_path)
    }
}

/// Start a background worker that periodically refreshes the domain cache.
///
/// This ensures new/updated websites are picked up without restart.
/// The worker runs every `interval` and re-queries all websites.
pub fn start_cache_refresh_worker(
    cache: Arc<DomainCache>,
    pool: PgPool,
    interval: Duration,
) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);
        // Skip the first immediate tick (cache was just warmed)
        ticker.tick().await;

        loop {
            ticker.tick().await;
            if let Err(e) = cache.refresh(&pool).await {
                tracing::error!("Failed to refresh domain cache: {}", e);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_host() {
        assert_eq!(extract_host("https://example.com"), "example.com");
        assert_eq!(extract_host("http://example.com:8080"), "example.com");
        assert_eq!(
            extract_host("https://blog.example.com/path"),
            "blog.example.com"
        );
        assert_eq!(extract_host("example.com"), "example.com");
        assert_eq!(extract_host("https://example.com:443"), "example.com");
    }

    #[test]
    fn test_registered_origin_cors() {
        let cache = DomainCache::new(100, 300);
        cache.replace_hosts(["hrnkystrikem.cz", "https://Other.com/"].into_iter());

        assert!(cache.is_registered_origin("https://hrnkystrikem.cz"));
        assert!(cache.is_registered_origin("https://www.hrnkystrikem.cz"));
        assert!(cache.is_registered_origin("https://shop.hrnkystrikem.cz"));
        assert!(cache.is_registered_origin("https://a.b.hrnkystrikem.cz:8443"));
        assert!(cache.is_registered_origin("https://other.com"));
        assert!(!cache.is_registered_origin("https://evilhrnkystrikem.cz"));
        assert!(!cache.is_registered_origin("https://hrnkystrikem.cz.evil.com"));
        assert!(!cache.is_registered_origin("https://cz"));
        assert!(!cache.is_registered_origin("null"));
        assert!(!cache.is_registered_origin("hrnkystrikem.cz"));
    }

    #[tokio::test]
    async fn test_cache_get_miss() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        assert!(cache.get(&id).await.is_none());
    }

    #[tokio::test]
    async fn test_cache_get_hit() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        cache.inner.insert(id, "example.com".to_string()).await;
        assert_eq!(cache.get(&id).await, Some("example.com".to_string()));
    }

    #[tokio::test]
    async fn test_validate_origin_exact_match() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        cache.inner.insert(id, "example.com".to_string()).await;

        assert!(cache
            .validate_origin(&id, "https://example.com")
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn test_validate_origin_www_match() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        cache.inner.insert(id, "example.com".to_string()).await;

        assert!(cache
            .validate_origin(&id, "https://www.example.com")
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn test_validate_origin_subdomain_match() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        cache.inner.insert(id, "example.com".to_string()).await;

        assert!(cache
            .validate_origin(&id, "https://blog.example.com")
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn test_validate_origin_mismatch() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();
        cache.inner.insert(id, "example.com".to_string()).await;

        assert!(cache
            .validate_origin(&id, "https://evil.com")
            .await
            .is_err());
    }

    #[tokio::test]
    async fn test_validate_origin_unknown_website() {
        let cache = DomainCache::new(100, 300);
        let id = Uuid::new_v4();

        assert!(cache
            .validate_origin(&id, "https://example.com")
            .await
            .is_err());
    }
}
