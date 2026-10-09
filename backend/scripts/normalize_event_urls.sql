-- One-off cleanup for events stored before the collector normalized URLs.
--   1. url      -> path only (no scheme/host/query/fragment); empty -> '/'
--   2. referrer -> NULL when it is the tracked site itself (apex, www or subdomain)
--
-- Run manually and idempotently (safe to re-run):
--   psql "$DATABASE_URL" -f backend/scripts/normalize_event_urls.sql
-- Preview first by replacing COMMIT with ROLLBACK.

BEGIN;

UPDATE events
SET url = COALESCE(
        NULLIF(
            split_part(split_part(regexp_replace(url, '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*', ''), '?', 1), '#', 1),
            ''
        ),
        '/'
    )
WHERE url ~ '^[A-Za-z][A-Za-z0-9+.-]*://'
   OR url ~ '[?#]';

WITH site AS (
    SELECT id,
           lower(regexp_replace(regexp_replace(regexp_replace(domain, '^[A-Za-z]+://', ''), '[/:].*$', ''), '^www\.', '')) AS host
    FROM websites
),
ev AS (
    SELECT e.ctid AS row_id, e.created_at, s.host,
           regexp_replace(lower(substring(e.referrer from '^[A-Za-z]+://([^/?#:@]+)')), '^www\.', '') AS ref_host
    FROM events e
    JOIN site s ON s.id = e.website_id
    WHERE e.referrer IS NOT NULL
)
UPDATE events e
SET referrer = NULL
FROM ev
WHERE e.ctid = ev.row_id
  AND e.created_at = ev.created_at
  AND ev.ref_host IS NOT NULL
  AND (ev.ref_host = ev.host OR ev.ref_host LIKE '%.' || ev.host);

COMMIT;
