import { keepPreviousData, useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { browserTimeZone } from '@/lib/dates';
import type {
    Stats,
    ChartDataPoint,
    MetricData,
    MetricType,
    DateRange,
    CountryStat,
    CityStat,
    RealtimeData,
} from '@/types/api';

// ── Scope ────────────────────────────────────────────────

/** What a query reads from: a website the user can open, or a public share link. */
export interface AnalyticsScope {
    id: string;
    shared?: boolean;
}

const scopePath = ({ id, shared }: AnalyticsScope) =>
    shared ? `/api/analytics/shared/${id}` : `/api/analytics/${id}`;

// ── Query Keys ───────────────────────────────────────────
export const analyticsKeys = {
    activeVisitors: (websiteId: string) =>
        ['analytics', 'active', websiteId] as const,
    teamStats: (teamId: string, range: DateRange) =>
        ['analytics', 'team-stats', teamId, range] as const,
    publicActiveVisitors: (shareId: string) =>
        ['analytics', 'public', 'active', shareId] as const,
};

// ── Queries ──────────────────────────────────────────────

/**
 * One GET against a website's (or share link's) analytics, filtered by date range.
 * The previous result stays on screen while a new range loads, so a refresh or a
 * range change dims the cards instead of flashing them back to skeletons.
 */
function useScopedQuery<T>(
    scope: AnalyticsScope,
    endpoint: 'stats' | 'chart' | 'metrics' | 'countries' | 'cities',
    range: DateRange,
    params: Record<string, string> = {},
    enabled = true,
) {
    return useQuery<T>({
        queryKey: [
            'analytics',
            endpoint,
            scope.shared ? 'public' : 'site',
            scope.id,
            range,
            params,
        ] as const,
        queryFn: async () => {
            const search = new URLSearchParams(params);
            if (range.from) search.set('start_at', range.from);
            if (range.to) search.set('end_at', range.to);
            const { data } = await apiClient.get<T>(
                `${scopePath(scope)}/${endpoint}?${search.toString()}`,
            );
            return data;
        },
        enabled: !!scope.id && enabled,
        placeholderData: keepPreviousData,
    });
}

/** Aggregated stats within a date range. */
export function useStats(scope: AnalyticsScope, range: DateRange, enabled = true) {
    return useScopedQuery<Stats>(scope, 'stats', range, {}, enabled);
}

/** Time-series chart data (views, visitors, per-bucket bounce rate and duration). */
export function useChartData(
    scope: AnalyticsScope,
    range: DateRange,
    interval: string = 'day',
    enabled = true,
) {
    return useScopedQuery<ChartDataPoint[]>(
        scope,
        'chart',
        range,
        { interval, tz: browserTimeZone },
        enabled,
    );
}

/** Top values of one dimension (pages, referrers, browsers, ...). */
export function useMetrics(
    scope: AnalyticsScope,
    metricType: MetricType,
    range: DateRange,
    limit = 10,
) {
    return useScopedQuery<MetricData[]>(scope, 'metrics', range, {
        metric_type: metricType,
        limit: String(limit),
    });
}

/** Distinct visitors per country, for the map and the country list. */
export function useCountryStats(scope: AnalyticsScope, range: DateRange) {
    return useScopedQuery<CountryStat[]>(scope, 'countries', range);
}

/** Visitors per city, for the map dots and the city list. */
export function useCityStats(scope: AnalyticsScope, range: DateRange) {
    return useScopedQuery<CityStat[]>(scope, 'cities', range);
}

/** Fetch active visitors count (last 5 minutes). Auto-refreshes every 30s. */
export function useActiveVisitors(websiteId: string) {
    return useQuery<number>({
        queryKey: analyticsKeys.activeVisitors(websiteId),
        queryFn: async () => {
            const { data } = await apiClient.get<number>(
                `/api/analytics/${websiteId}/active`,
            );
            return data;
        },
        enabled: !!websiteId,
        refetchInterval: 30_000,
    });
}

/** Last-30-minutes snapshot. Polls every 10s while the tab is visible. */
export function useRealtime(websiteId: string, enabled = true) {
    return useQuery<RealtimeData>({
        queryKey: ['analytics', 'realtime', websiteId] as const,
        queryFn: async () => {
            const { data } = await apiClient.get<RealtimeData>(
                `/api/analytics/${websiteId}/realtime`,
            );
            return data;
        },
        enabled: !!websiteId && enabled,
        refetchInterval: 10_000,
    });
}

/** Fetch aggregated stats for an entire team. */
export function useTeamStats(teamId: string, range: DateRange) {
    return useQuery<Stats>({
        queryKey: analyticsKeys.teamStats(teamId, range),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            const { data } = await apiClient.get<Stats>(
                `/api/analytics/team/${teamId}/stats?${params.toString()}`,
            );
            return data;
        },
        enabled: !!teamId,
    });
}

// ── Public Queries ───────────────────────────────────────

/** Public last-30-minutes snapshot by share ID. Polls every 10s. */
export function usePublicRealtime(shareId: string) {
    return useQuery<RealtimeData>({
        queryKey: ['analytics', 'public', 'realtime', shareId] as const,
        queryFn: async () => {
            const { data } = await apiClient.get<RealtimeData>(
                `/api/analytics/shared/${shareId}/realtime`,
            );
            return data;
        },
        enabled: !!shareId,
        refetchInterval: 10_000,
    });
}

/** Fetch public active visitors count by share ID. */
export function usePublicActiveVisitors(shareId: string) {
    return useQuery<number>({
        queryKey: analyticsKeys.publicActiveVisitors(shareId),
        queryFn: async () => {
            const { data } = await apiClient.get<number>(
                `/api/analytics/shared/${shareId}/active`,
            );
            return data;
        },
        enabled: !!shareId,
        refetchInterval: 30_000,
    });
}
