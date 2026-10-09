-- updateWebsiteShare used to store share_config as a JSON *string* holding JSON
-- (double-encoded), which made every shared feature read as disabled. Unwrap those rows.
UPDATE websites
SET share_config = (share_config #>> '{}')::jsonb
WHERE jsonb_typeof(share_config) = 'string';
