-- API keys for server-to-server access to the Dashboard API.
--
-- The initial schema shipped an `api_keys` table with a plaintext `key`
-- column that no code path ever read or wrote. This migration reshapes it for
-- hash-only storage: the SHA-256 of the full secret is persisted, the
-- plaintext is shown to the user exactly once, at creation time.

-- Fresh installs where the table is somehow absent.
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash CHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- Existing installs: bring the legacy table up to the new shape.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(16);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash CHAR(64);
ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Plaintext secrets are never stored.
ALTER TABLE api_keys DROP COLUMN IF EXISTS key;

-- Any pre-existing row has no hash and therefore can never authenticate;
-- removing it is what allows the NOT NULL constraints below.
DELETE FROM api_keys WHERE key_hash IS NULL;

ALTER TABLE api_keys ALTER COLUMN key_prefix SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN key_hash SET NOT NULL;

-- Lookup path: find candidates by the (non-secret) prefix, then compare hashes.
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_team ON api_keys (team_id);
