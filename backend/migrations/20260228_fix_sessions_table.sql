-- Migration to fix sessions table for tower-sessions
-- The previous sessions table was designed for NextAuth/Auth.js

-- 1. Rename old sessions table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
        -- Check if it's the old schema (has sessionToken instead of id)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'sessionToken') THEN
            ALTER TABLE "sessions" RENAME TO "legacy_sessions";
        END IF;
    END IF;
END $$;

-- 2. Create correct sessions table for tower-sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT PRIMARY KEY,
    "data" BYTEA NOT NULL,
    "expiry" TIMESTAMPTZ NOT NULL
);

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS "idx_sessions_expiry" ON "sessions" ("expiry");
