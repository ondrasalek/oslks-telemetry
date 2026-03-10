-- Migration: Add TimescaleDB retention policies
-- Drops raw event data older than 90 days to save disk space
-- (Aggregated data in hourly_stats is preserved indefinitely)

SELECT add_retention_policy('events', INTERVAL '90 days', if_not_exists => TRUE);
