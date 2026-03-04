//! GeoIP lookup utility for OSLKS Telemetry
//!
//! Provides functions to look up country information from IP addresses
//! using MaxMind GeoIP2 databases.

use maxminddb::geoip2;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;

pub struct GeoIpReader {
    reader: Arc<maxminddb::Reader<Vec<u8>>>,
}

impl GeoIpReader {
    /// Create a new GeoIpReader from a database file path
    pub fn open(path: &str) -> Result<Self, String> {
        let reader = maxminddb::Reader::open_readfile(path)
            .map_err(|e| format!("Failed to open GeoIP database: {}", e))?;
        Ok(Self {
            reader: Arc::new(reader),
        })
    }

    /// Look up the ISO country code and city name for an IP address
    /// Returns (Country ISO Code, City Name)
    pub fn lookup(&self, ip_str: &str) -> (Option<String>, Option<String>) {
        let ip = match IpAddr::from_str(ip_str) {
            Ok(ip) => ip,
            Err(_) => return (None, None),
        };

        // Use City database which includes Country data
        let city_data: geoip2::City = match self.reader.lookup(ip) {
            Ok(data) => data,
            Err(_) => return (None, None),
        };

        let country = city_data
            .country
            .and_then(|c| c.iso_code)
            .map(|s| s.to_string());

        let city = city_data
            .city
            .and_then(|c| c.names)
            .and_then(|n| n.get("en").map(|s| s.to_string()));

        (country, city)
    }
}
