# OSLKS Radar — combined image.
#
# Bundles all three runtimes into one container, supervised by s6-overlay:
#   collector     Rust/Axum, :8080 — ingest + migrations
#   dashboard-api Node/Express, :8081
#   caddy         static SPA + reverse proxy, :80 (the only exposed port)
#
# Build context is the repository root.

# ── 1. Rust collector ────────────────────────────────────
FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS collector-planner
COPY backend/ .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS collector-builder
COPY --from=collector-planner /app/recipe.json recipe.json
# Dependency build — the expensive layer worth caching
RUN cargo chef cook --release --recipe-path recipe.json
COPY backend/ .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin oslks-telemetry \
    && strip target/release/oslks-telemetry

# ── 2. Dashboard API ─────────────────────────────────────
FROM node:20-bookworm-slim AS api-builder
WORKDIR /app
COPY dashboard-api/package*.json ./
RUN npm ci
COPY dashboard-api/ .
RUN npm run build

FROM node:20-bookworm-slim AS api-deps
WORKDIR /app
COPY dashboard-api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── 3. Frontend SPA ──────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app
COPY frontend-react/package.json frontend-react/package-lock.json ./
RUN npm ci
COPY frontend-react/ .
ARG VITE_APP_URL
ARG VITE_OSLKS_COLLECTOR_URL
ARG VITE_OSLKS_WEBSITE_ID
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_OSLKS_COLLECTOR_URL=$VITE_OSLKS_COLLECTOR_URL
ENV VITE_OSLKS_WEBSITE_ID=$VITE_OSLKS_WEBSITE_ID
RUN npm run build

# ── 4. Runtime ───────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

ARG S6_OVERLAY_VERSION=3.2.0.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libssl3 \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# s6-overlay supervises the three processes and handles PID 1 duties.
# Fetched with curl rather than ADD so the asset name can follow TARGETARCH —
# CI builds amd64, Apple Silicon builds arm64.
ARG TARGETARCH
RUN set -eu; \
    case "${TARGETARCH}" in \
        amd64) S6_ARCH=x86_64 ;; \
        arm64) S6_ARCH=aarch64 ;; \
        *) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    base="https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}"; \
    curl -fsSL -o /tmp/s6-noarch.tar.xz "${base}/s6-overlay-noarch.tar.xz"; \
    curl -fsSL -o /tmp/s6-arch.tar.xz "${base}/s6-overlay-${S6_ARCH}.tar.xz"; \
    tar -C / -Jxpf /tmp/s6-noarch.tar.xz; \
    tar -C / -Jxpf /tmp/s6-arch.tar.xz; \
    rm /tmp/s6-noarch.tar.xz /tmp/s6-arch.tar.xz

# Caddy is a static Go binary, so the alpine image's copy runs fine here
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/bin/caddy

# SRE: Zero Trust — every supervised process runs as this user
RUN groupadd -r oslks && useradd -M -r -g oslks oslks

# Collector + its GeoIP database
COPY --from=collector-builder /app/target/release/oslks-telemetry /app/collector/oslks-telemetry
COPY backend/src/data/GeoLite2-City.mmdb /app/collector/GeoLite2-City.mmdb

# Dashboard API (compiled output + production dependencies only)
COPY --from=api-builder /app/dist /app/dashboard-api/dist
COPY --from=api-deps /app/node_modules /app/dashboard-api/node_modules
COPY dashboard-api/package*.json /app/dashboard-api/

# Frontend static bundle + proxy config
COPY --from=frontend-builder /app/dist /srv
COPY docker/Caddyfile /etc/caddy/Caddyfile

# Supervision tree
COPY docker/s6/ /etc/s6-overlay/s6-rc.d/
COPY docker/scripts/ /etc/s6-overlay/scripts/
RUN chmod +x /etc/s6-overlay/scripts/* \
    /etc/s6-overlay/s6-rc.d/collector/run \
    /etc/s6-overlay/s6-rc.d/collector/finish \
    /etc/s6-overlay/s6-rc.d/dashboard-api/run \
    /etc/s6-overlay/s6-rc.d/dashboard-api/finish \
    /etc/s6-overlay/s6-rc.d/caddy/run \
    /etc/s6-overlay/s6-rc.d/caddy/finish \
    /etc/s6-overlay/s6-rc.d/collector-ready/up

RUN mkdir -p /data /config \
    && chown -R oslks:oslks /app /srv /data /config /etc/caddy

ENV NODE_ENV=production \
    GEOIP_DB_PATH=/app/collector/GeoLite2-City.mmdb \
    S6_KEEP_ENV=1 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2

# PORT is deliberately not set: the collector and the dashboard API both read
# it, so each service's run script exports its own.

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD curl -fsS -o /dev/null http://127.0.0.1:8080/health \
     && curl -fsS -o /dev/null http://127.0.0.1:8081/health \
     && curl -fsS -o /dev/null http://127.0.0.1:80/ || exit 1

ENTRYPOINT ["/init"]
