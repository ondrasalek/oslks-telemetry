//! Bot and crawler detection for OSLKS Telemetry
//!
//! Filters out known bots, crawlers, and automated tools to ensure
//! accurate analytics data.

/// List of known bot User-Agent patterns (case-insensitive matching)
const BOT_PATTERNS: &[&str] = &[
    // Search engine bots
    "googlebot",
    "bingbot",
    "yandexbot",
    "duckduckbot",
    "baiduspider",
    "sogou",
    "exabot",
    "facebot",
    "ia_archiver",
    // Social media bots
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "pinterest",
    "slackbot",
    "telegrambot",
    "whatsapp",
    "discordbot",
    // SEO and monitoring tools
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "dotbot",
    "rogerbot",
    "screaming frog",
    "seokicks",
    "sistrix",
    // Generic bot patterns
    "bot",
    "crawler",
    "spider",
    "scraper",
    "fetch",
    // Headless browsers and automation
    "headless",
    "phantom",
    "selenium",
    "puppeteer",
    "playwright",
    "webdriver",
    // HTTP libraries (often indicate automated requests)
    "python-requests",
    "python-urllib",
    "go-http-client",
    "java/",
    "libwww",
    "wget",
    "curl",
    "httpie",
    // Preview generators
    "preview",
    "thumbnail",
    // Monitoring and uptime checkers
    "uptime",
    "monitor",
    "pingdom",
    "statuscake",
    "newrelic",
    "datadog",
    // Feed readers
    "feedfetcher",
    "feedly",
    "newsblur",
];

/// Check if the given User-Agent string belongs to a known bot or crawler
///
/// # Arguments
/// * `user_agent` - The User-Agent header value to check
///
/// # Returns
/// `true` if the User-Agent matches a known bot pattern, `false` otherwise
pub fn is_bot(user_agent: &str) -> bool {
    if user_agent.is_empty() {
        return true; // Empty User-Agent is suspicious
    }

    let ua_lower = user_agent.to_lowercase();

    BOT_PATTERNS.iter().any(|pattern| ua_lower.contains(pattern))
}

/// Get the device type from User-Agent
pub fn detect_device_type(user_agent: &str) -> &'static str {
    let ua_lower = user_agent.to_lowercase();

    if ua_lower.contains("mobile") || ua_lower.contains("android") && !ua_lower.contains("tablet") {
        "mobile"
    } else if ua_lower.contains("tablet") || ua_lower.contains("ipad") {
        "tablet"
    } else if ua_lower.contains("smart-tv") || ua_lower.contains("smarttv") || ua_lower.contains("tv") {
        "tv"
    } else {
        "desktop"
    }
}

/// Extract browser name from User-Agent
pub fn detect_browser(user_agent: &str) -> &'static str {
    let ua_lower = user_agent.to_lowercase();

    if ua_lower.contains("edg/") || ua_lower.contains("edge/") {
        "Edge"
    } else if ua_lower.contains("opr/") || ua_lower.contains("opera") {
        "Opera"
    } else if ua_lower.contains("chrome") && !ua_lower.contains("chromium") {
        "Chrome"
    } else if ua_lower.contains("firefox") {
        "Firefox"
    } else if ua_lower.contains("safari") && !ua_lower.contains("chrome") {
        "Safari"
    } else if ua_lower.contains("msie") || ua_lower.contains("trident") {
        "Internet Explorer"
    } else {
        "Other"
    }
}

/// Extract OS name from User-Agent
pub fn detect_os(user_agent: &str) -> &'static str {
    let ua_lower = user_agent.to_lowercase();

    if ua_lower.contains("windows") {
        "Windows"
    } else if ua_lower.contains("mac os") || ua_lower.contains("macos") {
        "macOS"
    } else if ua_lower.contains("iphone") || ua_lower.contains("ipad") {
        "iOS"
    } else if ua_lower.contains("android") {
        "Android"
    } else if ua_lower.contains("linux") {
        "Linux"
    } else if ua_lower.contains("chromeos") {
        "ChromeOS"
    } else {
        "Other"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bot_detection() {
        assert!(is_bot("Googlebot/2.1"));
        assert!(is_bot("Mozilla/5.0 (compatible; Bingbot/2.0)"));
        assert!(is_bot("python-requests/2.28.0"));
        assert!(is_bot(""));

        assert!(!is_bot(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        ));
        assert!(!is_bot(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
        ));
    }

    #[test]
    fn test_device_detection() {
        assert_eq!(
            detect_device_type("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"),
            "mobile"
        );
        assert_eq!(
            detect_device_type("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)"),
            "tablet"
        );
        assert_eq!(
            detect_device_type("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
            "desktop"
        );
    }

    #[test]
    fn test_browser_detection() {
        assert_eq!(
            detect_browser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36"),
            "Chrome"
        );
        assert_eq!(detect_browser("Mozilla/5.0 Firefox/120.0"), "Firefox");
        assert_eq!(
            detect_browser("Mozilla/5.0 Safari/605.1.15"),
            "Safari"
        );
    }

    #[test]
    fn test_os_detection() {
        assert_eq!(detect_os("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "Windows");
        assert_eq!(
            detect_os("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
            "macOS"
        );
        assert_eq!(detect_os("Mozilla/5.0 (Linux; Android 13)"), "Android");
    }
}
