# 🦀 OSLKS Radar — Collector Backend

High-performance telemetry collector built with **Rust**, **Axum**, and **SQLx**.

## Overview

The collector is responsible for:

- **Receiving events** — `POST /v1/p` accepts pageview and custom events from the tracker script
- **Serving the tracker script** — `GET /lib/j` serves a lightweight `<1KB` JavaScript tracker
- **Origin validation** — O(1) in-memory domain cache (Moka) validates `website_id` + `Origin` header
- **GeoIP enrichment** — optional MaxMind GeoLite2 database for location data
- **Stealth routes** — `/assets/v1/` prefixed routes for ad-blocker resilience
- **Bot filtering** — automatic detection and rejection of crawlers

## API Endpoints

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/lib/j` | Serve tracker JavaScript |
| `GET` | `/assets/v1/lib/j` | Serve tracker (stealth prefix) |
| `POST` | `/v1/p` | Collect telemetry event |
| `POST` | `/assets/v1/v1/p` | Collect event (stealth prefix) |
| `GET` | `/ws` | WebSocket for real-time updates |
| `GET` | `/health` | Simple health check |
| `GET` | `/api/health` | Detailed health check |

## Event Payload

```json
{
    "website_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/page",
    "referrer": "https://google.com",
    "event_type": "pageview",
    "event_name": null,
    "event_data": null,
    "screen_width": 1920,
    "screen_height": 1080,
    "language": "en-US"
}
```

## Environment Variables

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | — | Secret for session ID generation |
| `HOST` | ❌ | `0.0.0.0` | Bind host |
| `PORT` | ❌ | `8080` | Bind port |
| `CORS_ALLOWED_ORIGINS` | ❌ | mirror mode | Comma-separated origins |
| `GEOIP_DB_PATH` | ❌ | — | Path to GeoLite2-City.mmdb |
| `RUST_LOG` | ❌ | `info` | Log level filter |

## Origin Validation

The collector uses a **Moka cache** to validate requests without touching the database:

1. On startup, the cache is **warmed** with all `(website_id, domain)` pairs from the DB
2. A **background worker** refreshes the cache every 5 minutes
3. For each event, the `Origin` or `Referer` header is compared against the cached domain
4. Mismatches return `403 Forbidden` — no database query per request
5. Supports exact match, `www.` normalization, and subdomain matching

## Development

### Prerequisites

- Rust 1.84+
- PostgreSQL / TimescaleDB running

### Setup

```bash
# Create .env with local settings
cat > .env <<EOF
DATABASE_URL=postgres://user:pass@localhost:5432/oslks_telemetry?sslmode=disable
SESSION_SECRET=local_dev_secret_key_change_me
RUST_LOG=oslks_telemetry=debug,tower_http=debug
CORS_ALLOWED_ORIGINS=http://localhost:3000
HOST=0.0.0.0
PORT=8080
EOF

# Run (migrations are applied automatically on startup)
cargo run
# → http://127.0.0.1:8080

# Test health
curl http://127.0.0.1:8080/health
```

### Database Migrations

Migrations are managed via `sqlx` and run automatically on startup.

```bash
# Create a new migration
sqlx migrate add <name>
```

### Production Build

```bash
cargo build --release
# Binary: target/release/oslks-telemetry
```

## Project Structure

```text
src/
├── api/
│   ├── handlers.rs     # HTTP handlers (collect, get_script, health)
│   └── error.rs        # API error types
├── db/
│   └── models.rs       # Database models (Website, Event)
├── tracker/
│   └── script.js       # Client-side tracking script
├── domain_cache.rs     # Moka-based origin validation cache
├── config.rs           # Environment configuration
├── pinger.rs           # Background health pinger
└── main.rs             # Server setup and router
```

## Features

- **High Performance** — Async I/O with Tokio and Axum
- **TimescaleDB** — Optimized for time-series data
- **Cookie-less** — Privacy-friendly tracking using daily rotating salts
- **Bot Detection** — Filters out crawlers and bots
- **O(1) Validation** — In-memory cache eliminates per-request DB queries
