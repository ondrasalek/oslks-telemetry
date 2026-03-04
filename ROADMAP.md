# Technical Roadmap: Improving OSLKS Telemetry

This document outlines the remaining implementation logic for the technical improvements to the OSLKS stack.

---

## 1. Advanced Analytics (TimescaleDB + HLL)

**Goal**: Maintain high performance as data scales to millions of rows and provide accurate/approximate unique counts.

### Analytics Implementation Logic

1. **Hyperloglog (HLL)**: Integrate the `postgresql-hll` extension for approximate unique counts (visitors) in continuous aggregates.
2. **Downsampling Policies**: Implement more aggressive data retention and downsampling for older metrics.

```sql
-- Approximate unique counts using HLL
-- This would replace 'count(distinct session_id)' in hourly_stats
SELECT time_bucket('1 hour', created_at) AS hour,
       website_id,
       count(*) as pageviews,
       hll_add_agg(hll_hash_text(session_id)) as visitors_hll
FROM events
GROUP BY hour, website_id;
```

---

## 2. Configuration Flexibility

**Goal**: Remove hardcoded configuration to support easier self-hosting and deployment in various environments (Coolify, K8s, etc).

- [x] **Refactor Hardcoded URLs**: Refactored to read from environment variables and updated documentation to use generic placeholders (`example.com`).

---
