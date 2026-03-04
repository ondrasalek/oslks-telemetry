-- OSLKS Telemetry - Complete Database Schema
-- Includes Backend (Events) and Frontend (Auth/Admin) tables
-- Requires PostgreSQL 16+ with TimescaleDB extension

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- 1. FRONTEND TABLES (Auth.js / NextAuth)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    "image" TEXT,
    "password" TEXT,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS "accounts" (
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(255),
    "scope" VARCHAR(255),
    "id_token" TEXT,
    "session_state" TEXT,
    PRIMARY KEY ("provider", "providerAccountId")
);

-- Sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
    "sessionToken" VARCHAR(255) PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires" TIMESTAMPTZ NOT NULL
);

-- Verification Token table
CREATE TABLE IF NOT EXISTS "verification_token" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- ============================================
-- 2. BACKEND TABLES (Telemetry)
-- ============================================

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    icon_url TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    share_id VARCHAR(64) UNIQUE,
    status VARCHAR(20) DEFAULT 'unknown',
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table (Hypertable)
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    referrer TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'pageview',
    event_name VARCHAR(255),
    event_data JSONB,
    user_agent TEXT,
    country VARCHAR(2),
    city VARCHAR(255),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

-- Convert to hypertable
SELECT create_hypertable('events', 'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Indexes for websites and events
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites (domain);
CREATE INDEX IF NOT EXISTS idx_websites_share_id ON websites (share_id);
CREATE INDEX IF NOT EXISTS idx_events_website_time ON events (website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id, created_at DESC);

-- ============================================
-- 3. TEAMS & MULTI-TENANCY
-- ============================================

-- Teams table
CREATE TABLE IF NOT EXISTS "teams" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "icon_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Members table
CREATE TABLE IF NOT EXISTS "team_members" (
    "team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("team_id", "user_id")
);

-- Update Users table to track current session team
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_team_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL;

-- Update Websites table to belong to a team
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE;

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user ON "team_members" ("user_id");
CREATE INDEX IF NOT EXISTS idx_websites_team ON "websites" ("team_id");

-- ============================================
-- 4. API KEYS
-- ============================================

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key VARCHAR(64) NOT NULL UNIQUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- ============================================
-- 5. SYSTEM SETTINGS
-- ============================================

-- System Settings table (key-value store for global config like SMTP)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
