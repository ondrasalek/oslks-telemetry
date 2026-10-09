//! URL normalization applied to events before they are stored.

/// Reduce a page URL to its path: no scheme, host, query string or fragment.
/// `https://www.example.com/meme/?x=1` -> `/meme/`. Empty paths become `/`.
pub fn normalize_page_url(raw: &str) -> String {
    let raw = raw.trim();
    let rest = match raw.split_once("://") {
        Some((_, after)) => after.find('/').map_or("", |i| &after[i..]),
        None => raw,
    };
    let path = rest.split(['?', '#']).next().unwrap_or("");
    if path.is_empty() {
        "/".to_string()
    } else if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    }
}

/// Host of an http(s) URL, lowercased, without port or leading `www.`.
fn host_of(url: &str) -> Option<String> {
    let after = url.trim().split_once("://")?.1;
    let authority = after.split(['/', '?', '#']).next()?;
    let authority = authority.rsplit('@').next()?;
    let host = authority.rsplit_once(':').map_or(authority, |(h, _)| h);
    let host = host.to_ascii_lowercase();
    let host = host.strip_prefix("www.").unwrap_or(&host);
    (!host.is_empty()).then(|| host.to_string())
}

/// True if `referrer` points at the tracked `domain` itself, its `www.` form or
/// any subdomain. Such navigation is internal, not a traffic source.
pub fn is_self_referrer(domain: &str, referrer: &str) -> bool {
    let domain = domain.trim();
    let domain_host = host_of(domain)
        .or_else(|| host_of(&format!("https://{domain}")));
    let (Some(domain_host), Some(ref_host)) = (domain_host, host_of(referrer)) else {
        return false;
    };
    ref_host == domain_host || ref_host.ends_with(&format!(".{domain_host}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn page_url_to_path() {
        assert_eq!(normalize_page_url("https://www.hrnkystrikem.cz/meme/"), "/meme/");
        assert_eq!(
            normalize_page_url("https://www.hrnkystrikem.cz/?sznaiid=7263039861768176234"),
            "/"
        );
        assert_eq!(normalize_page_url("https://a.cz"), "/");
        assert_eq!(normalize_page_url("https://a.cz/x/y?z=1#top"), "/x/y");
        assert_eq!(normalize_page_url("/already/path?q"), "/already/path");
    }

    #[test]
    fn self_referrer() {
        assert!(is_self_referrer("hrnkystrikem.cz", "https://www.hrnkystrikem.cz/obchodni-podminky/"));
        assert!(is_self_referrer("https://hrnkystrikem.cz", "https://shop.hrnkystrikem.cz/"));
        assert!(is_self_referrer("www.hrnkystrikem.cz", "http://hrnkystrikem.cz:8080/x"));
        assert!(!is_self_referrer("hrnkystrikem.cz", "https://97.c-ko.imedia.cz/"));
        assert!(!is_self_referrer("hrnkystrikem.cz", "https://evilhrnkystrikem.cz/"));
        assert!(!is_self_referrer("hrnkystrikem.cz", "https://hrnkystrikem.cz.evil.com/"));
    }
}
