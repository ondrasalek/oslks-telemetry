use std::time::Duration;
use reqwest::Client;

/// Metadata fetched from a website's HTML
#[derive(Debug, Default)]
pub struct WebsiteMetadata {
    pub title: Option<String>,
    pub icon_url: Option<String>,
}

/// Fetches a website's HTML and attempts to parse the <title> and favicon URL.
/// Handles relative and absolute icon URLs.
pub async fn fetch_website_metadata(domain: &str) -> WebsiteMetadata {
    if domain.is_empty() || domain == "localhost" || domain.starts_with("127.0.0.1") {
        return WebsiteMetadata {
            title: None,
            icon_url: Some(format!("https://www.google.com/s2/favicons?domain={}&sz=64", domain)),
        };
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .user_agent("OSLKS-Telemetry-Metadata-Fetcher/1.0")
        .build()
        .unwrap_or_default();

    let url = if domain.starts_with("http") {
        domain.to_string()
    } else {
        format!("https://{}", domain)
    };

    let response = match client.get(&url).send().await {
        Ok(res) => res,
        Err(_) => {
            // Fallback to http if https fails
            let http_url = format!("http://{}", domain);
            match client.get(&http_url).send().await {
                Ok(res) => res,
                Err(_) => {
                    return WebsiteMetadata {
                        title: None,
                        icon_url: Some(format!("https://www.google.com/s2/favicons?domain={}&sz=64", domain)),
                    };
                }
            }
        }
    };

    // Make sure we successfully got a response
    if !response.status().is_success() {
        return WebsiteMetadata {
            title: None,
            icon_url: Some(format!("https://www.google.com/s2/favicons?domain={}&sz=64", domain)),
        };
    }

    // Try to get the final resolved URL (following redirects) to resolve relative icon paths
    let base_url = response.url().clone();
    
    // Read the body (limit to first 100KB to prevent parsing massive files for just the <head>)
    let body_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(_) => return WebsiteMetadata {
            title: None,
            icon_url: Some(format!("https://www.google.com/s2/favicons?domain={}&sz=64", domain)),
        },
    };
    
    let limited_bytes: Vec<u8> = body_bytes.iter().take(100 * 1024).copied().collect();
    let html = String::from_utf8_lossy(&limited_bytes);

    let mut metadata = WebsiteMetadata {
        title: extract_title(&html),
        icon_url: extract_icon(&html, &base_url),
    };

    // Fallback to Google Favicon API if no icon was found in the HTML source
    if metadata.icon_url.is_none() {
        metadata.icon_url = Some(format!("https://www.google.com/s2/favicons?domain={}&sz=64", domain));
    }

    metadata
}

/// Helper to parse <title> tag
fn extract_title(html: &str) -> Option<String> {
    let title_start = html.find("<title>")?;
    let title_end = html[title_start..].find("</title>")?;
    
    let title = html[title_start + 7..title_start + title_end].trim().to_string();
    if title.is_empty() {
        None
    } else {
        Some(html_escape::decode_html_entities(&title).into_owned())
    }
}

/// Helper to parse <link rel="icon"> or <link rel="shortcut icon">
fn extract_icon(html: &str, base_url: &reqwest::Url) -> Option<String> {
    // Look for link tags
    let mut current_idx = 0;
    while let Some(link_start) = html[current_idx..].find("<link ") {
        let abs_start = current_idx + link_start;
        let link_end = html[abs_start..].find('>')?;
        let link_tag = &html[abs_start..abs_start + link_end + 1];
        
        let link_lower = link_tag.to_lowercase();
        if link_lower.contains("rel=\"icon\"") || 
           link_lower.contains("rel='icon'") ||
           link_lower.contains("rel=\"shortcut icon\"") ||
           link_lower.contains("rel='shortcut icon'") 
        {
            // Found a favicon link! Extract href.
            if let Some(href) = extract_href(link_tag) {
                // If it's absolute, return it
                if href.starts_with("http") {
                    return Some(href);
                }
                
                // If it's relative, resolve it against the base URL
                if let Ok(resolved) = base_url.join(&href) {
                    return Some(resolved.to_string());
                }
            }
        }
        
        current_idx = abs_start + link_end + 1;
    }
    None
}

fn extract_href(tag: &str) -> Option<String> {
    if let Some(start) = tag.find("href=\"") {
        let end = tag[start + 6..].find("\"")?;
        return Some(tag[start + 6..start + 6 + end].to_string());
    }
    if let Some(start) = tag.find("href='") {
        let end = tag[start + 6..].find("'")?;
        return Some(tag[start + 6..start + 6 + end].to_string());
    }
    None
}
