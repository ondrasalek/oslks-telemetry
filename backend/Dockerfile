# Chef stage for caching dependencies
FROM lukemathwalker/cargo-chef:latest-rust-1 as chef
WORKDIR /app

# Planner stage
FROM chef as planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Builder stage
FROM chef as builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin oslks-telemetry
# SRE: Strip binary symbols for minimal size
RUN strip target/release/oslks-telemetry

# Runtime stage (Debian slim for curl healthcheck + zero-trust security)
FROM debian:bookworm-slim as runtime
WORKDIR /app

# Install runtime dependencies (including curl for healthchecks)
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r nonroot && useradd -M -r -g nonroot nonroot

# Copy binary
COPY --from=builder /app/target/release/oslks-telemetry /app/oslks-telemetry

# Copy GeoIP Database
COPY src/data/GeoLite2-City.mmdb /app/GeoLite2-City.mmdb

# Set ownership
RUN chown -R nonroot:nonroot /app

# Configuration
ENV HOST="0.0.0.0"
ENV PORT="8080"
ENV GEOIP_DB_PATH="/app/GeoLite2-City.mmdb"

# Drop privileges to non-root user
USER nonroot

EXPOSE 8080

CMD ["/app/oslks-telemetry"]