-- Migration: Add hourly_stats continuous aggregate
-- Performance optimization for analytics dashboard

-- 1. Create the continuous aggregate view
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', created_at) AS bucket,
    website_id,
    COUNT(*) AS pageviews,
    COUNT(DISTINCT session_id) AS visitors
FROM events
GROUP BY bucket, website_id
WITH NO DATA;

-- 2. Add a refresh policy
-- Keeps the last 3 hours of data "real-time" and refreshes historical buckets hourly
SELECT add_continuous_aggregate_policy('hourly_stats',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- 3. Add compression policy for the aggregate (optional but recommended)
-- SELECT add_compression_policy('hourly_stats', compress_after => INTERVAL '30 days');
