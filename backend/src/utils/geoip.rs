//! GeoIP lookup utility for OSLKS Telemetry
//!
//! Provides functions to look up country information from IP addresses
//! using MaxMind GeoIP2 databases.

use maxminddb::geoip2;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;

/// Result of a GeoIP lookup. Every field is optional: private/unknown IPs yield none.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct GeoLocation {
    /// ISO 3166-1 alpha-2 country code
    pub country: Option<String>,
    pub city: Option<String>,
    /// City-centroid coordinates, rounded to 2 decimals (~1 km); see `round_coord`
    pub latitude: Option<f32>,
    pub longitude: Option<f32>,
}

/// Largest MaxMind accuracy radius (km) still treated as city-level.
const MAX_ACCURACY_RADIUS_KM: u16 = 200;

/// Rounds a coordinate to 2 decimals. GeoLite2 is only city-accurate, so extra
/// precision would be false precision and needlessly fine-grained to store.
fn round_coord(v: f64) -> f32 {
    ((v * 100.0).round() / 100.0) as f32
}

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

    /// Look up country, city and city-centroid coordinates for an IP address
    pub fn lookup(&self, ip_str: &str) -> GeoLocation {
        let ip = match IpAddr::from_str(ip_str) {
            Ok(ip) => ip,
            Err(_) => return GeoLocation::default(),
        };

        // Use City database which includes Country data
        let city_data: geoip2::City = match self.reader.lookup(ip) {
            Ok(data) => data,
            Err(_) => return GeoLocation::default(),
        };


        let country = city_data
            .country
            .and_then(|c| c.iso_code)
            .map(|s| s.to_string());

        let city = city_data
            .city
            .and_then(|c| c.names)
            .and_then(|n| n.get("en").map(|s| s.to_string()));

        // When MaxMind only knows the country or region it reports that area's centroid (and
        // its accuracy radius is not a reliable tell), which would plot a dot in the middle of
        // nowhere. Keep coordinates only for a named city with a small accuracy radius.
        let (latitude, longitude) = city_data
            .location
            .as_ref()
            .filter(|l| city.is_some() && l.accuracy_radius.is_some_and(|r| r <= MAX_ACCURACY_RADIUS_KM))
            .map(|l| (l.latitude.map(round_coord), l.longitude.map(round_coord)))
            .unwrap_or((None, None));

        GeoLocation {
            country,
            city,
            latitude,
            longitude,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounds_to_two_decimals() {
        assert_eq!(round_coord(50.087_451), 50.09);
        assert_eq!(round_coord(-14.420_21), -14.42);
        assert_eq!(round_coord(0.004), 0.0);
    }

    #[test]
    fn invalid_ip_yields_empty_location() {
        // No database needed: the address fails to parse before any lookup.
        let reader = GeoIpReader::open("src/data/GeoLite2-City.mmdb").expect("bundled db");
        assert_eq!(reader.lookup("not-an-ip"), GeoLocation::default());
    }

    #[test]
    fn private_ip_has_no_coordinates() {
        let reader = GeoIpReader::open("src/data/GeoLite2-City.mmdb").expect("bundled db");
        let loc = reader.lookup("192.168.1.10");
        assert_eq!((loc.latitude, loc.longitude), (None, None));
    }
}
