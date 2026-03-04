// ──────────────────────────────────────────────────────────
// OSLKS Radar — TypeScript API interfaces
// Mapped 1:1 from frontend/src/db/models.rs
// ──────────────────────────────────────────────────────────

/** User account — mirrors Rust `User` struct */
export interface AuthUser {
    id: string;
    name: string | null;
    email: string;
    role: 'superuser' | 'user';
    current_team_id: string | null;
    emailVerified: string | null; // ISO 8601 datetime
    image: string | null;
    created_at: string;
    updated_at: string;
}

/** Lightweight session representation */
export interface SessionUser {
    id: string;
    email: string;
    name: string | null;
    role: 'superuser' | 'user';
    team_id: string | null;
    team_role: string | null;
}

/** Team organisation */
export interface Team {
    id: string;
    name: string;
    slug: string;
    icon_url: string | null;
    created_at: string;
    updated_at: string;
}

/** Team with member count (admin view) */
export interface TeamWithMembers {
    id: string;
    name: string;
    slug: string;
    member_count: number;
    created_at: string;
}

/** Team member */
export interface TeamMember {
    user_id: string;
    user_name: string | null;
    user_email: string;
    role: string;
    joined_at: string;
}

/** Website being tracked */
export interface Website {
    id: string;
    domain: string;
    name: string | null;
    icon_url: string | null;
    team_id: string | null;
    share_id: string | null;
    share_config: Record<string, boolean>;
    is_pinned: boolean;
    status: string | null;
    last_ping_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Analytics statistics summary */
export interface Stats {
    pageviews: number;
    visitors: number;
    visits: number;
    bounce_rate: number;
    avg_duration: number;
}

/** Time-series chart data point */
export interface ChartDataPoint {
    timestamp: string; // ISO 8601
    views: number;
    visitors: number;
}

/** Metric breakdown row */
export interface MetricData {
    value: string;
    count: number;
}

/** Metric type enumeration */
export type MetricType =
    | 'url'
    | 'referrer'
    | 'browser'
    | 'os'
    | 'device_type'
    | 'country'
    | 'event_name';

/** A single telemetry event */
export interface TelemetryEvent {
    id: string;
    website_id: string;
    session_id: string;
    url: string;
    referrer: string | null;
    event_type: string;
    event_name: string | null;
    event_data: Record<string, unknown> | null;
    user_agent: string | null;
    country: string | null;
    city: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    created_at: string;
}

/** API key */
export interface ApiKey {
    id: string;
    user_id: string;
    name: string;
    key: string;
    last_used_at: string | null;
    created_at: string;
}

/** System setting */
export interface SystemSetting {
    key: string;
    value: unknown;
    created_at: string;
    updated_at: string;
}

// ── Request / Response types ─────────────────────────────

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    user: SessionUser | null;
    error: string | null;
}

export interface DateRange {
    from: string; // ISO 8601
    to: string;
}
