-- Set when an admin issues a one-time password; cleared once the user picks their own.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
