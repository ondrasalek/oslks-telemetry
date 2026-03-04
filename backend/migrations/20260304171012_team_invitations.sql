-- Migration for Team Invitations

CREATE TABLE IF NOT EXISTS "team_invitations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "token" VARCHAR(64) NOT NULL UNIQUE,
    "invited_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a user can only have one active invitation per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_team_email ON "team_invitations" ("team_id", "email");
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON "team_invitations" ("token");
