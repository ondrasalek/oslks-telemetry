import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type {
    Stats,
    ChartDataPoint,
    MetricData,
    MetricType,
    DateRange,
} from '@/types/api';

// ── Query Keys ───────────────────────────────────────────
export const analyticsKeys = {
    stats: (websiteId: string, range: DateRange) =>
        ['analytics', 'stats', websiteId, range] as const,
    chart: (websiteId: string, range: DateRange) =>
        ['analytics', 'chart', websiteId, range] as const,
    metrics: (websiteId: string, type: MetricType, range: DateRange) =>
        ['analytics', 'metrics', websiteId, type, range] as const,
    activeVisitors: (websiteId: string) =>
        ['analytics', 'active', websiteId] as const,
    teamStats: (teamId: string, range: DateRange) =>
        ['analytics', 'team-stats', teamId, range] as const,

    // Public keys
    publicStats: (shareId: string, range: DateRange) =>
        ['analytics', 'public', 'stats', shareId, range] as const,
    publicChart: (shareId: string, range: DateRange) =>
        ['analytics', 'public', 'chart', shareId, range] as const,
    publicMetrics: (shareId: string, type: MetricType, range: DateRange) =>
        ['analytics', 'public', 'metrics', shareId, type, range] as const,
    publicActiveVisitors: (shareId: string) =>
        ['analytics', 'public', 'active', shareId] as const,
};

// ── Queries ──────────────────────────────────────────────

/** Fetch aggregated stats for a website within a date range. */
export function useStats(websiteId: string, range: DateRange) {
    return useQuery<Stats>({
        queryKey: analyticsKeys.stats(websiteId, range),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            const { data } = await apiClient.get<Stats>(
                `/api/analytics/${websiteId}/stats?${params.toString()}`,
            );
            return data;
        },
        enabled: !!websiteId,
    });
}

/** Fetch time-series chart data for a website. */
export function useChartData(
    websiteId: string,
    range: DateRange,
    interval: string = 'day',
) {
    return useQuery<ChartDataPoint[]>({
        queryKey: [...analyticsKeys.chart(websiteId, range), interval],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            params.append('interval', interval);
            const { data } = await apiClient.get<ChartDataPoint[]>(
                `/api/analytics/${websiteId}/chart?${params.toString()}`,
            );
            return data;
        },
        enabled: !!websiteId,
    });
}

/** Fetch metric breakdown (top URLs, referrers, browsers, etc.). */
export function useMetrics(
    websiteId: string,
    metricType: MetricType,
    range: DateRange,
) {
    return useQuery<MetricData[]>({
        queryKey: analyticsKeys.metrics(websiteId, metricType, range),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            params.append('metric_type', metricType);
            params.append('limit', '10');
            const { data } = await apiClient.get<MetricData[]>(
                `/api/analytics/${websiteId}/metrics?${params.toString()}`,
            );
            return data;
        },
        enabled: !!websiteId,
    });
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

/** Fetch public stats by share ID. */
export function usePublicStats(shareId: string, range: DateRange) {
    return useQuery<Stats>({
        queryKey: analyticsKeys.publicStats(shareId, range),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            const { data } = await apiClient.get<Stats>(
                `/api/analytics/shared/${shareId}/stats?${params.toString()}`,
            );
            return data;
        },
        enabled: !!shareId,
    });
}

/** Fetch public time-series chart data by share ID. */
export function usePublicChartData(
    shareId: string,
    range: DateRange,
    interval: string = 'day',
) {
    return useQuery<ChartDataPoint[]>({
        queryKey: [...analyticsKeys.publicChart(shareId, range), interval],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            params.append('interval', interval);
            const { data } = await apiClient.get<ChartDataPoint[]>(
                `/api/analytics/shared/${shareId}/chart?${params.toString()}`,
            );
            return data;
        },
        enabled: !!shareId,
    });
}

/** Fetch public metric breakdown by share ID. */
export function usePublicMetrics(
    shareId: string,
    metricType: MetricType,
    range: DateRange,
) {
    return useQuery<MetricData[]>({
        queryKey: analyticsKeys.publicMetrics(shareId, metricType, range),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (range.from) params.append('start_at', range.from);
            if (range.to) params.append('end_at', range.to);
            params.append('metric_type', metricType);
            params.append('limit', '10');
            const { data } = await apiClient.get<MetricData[]>(
                `/api/analytics/shared/${shareId}/metrics?${params.toString()}`,
            );
            return data;
        },
        enabled: !!shareId,
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
