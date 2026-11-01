import { useEffect, useMemo, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { Pause, Play, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useChartData,
    useStats,
    type AnalyticsScope,
} from '@/hooks/use-analytics';
import { fillGaps, getDateRangeFromFilter } from '@/lib/dates';
import type { BucketInterval } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AnalyticsChart, ChartLegend } from './analytics-chart';
import { DateFilter } from './date-filter';
import { DeviceCard } from './device-card';
import { LocationsCard } from './locations-card';
import { MetricTableCard } from './metric-table-card';
import { OverviewCard } from './overview-card';
import { Panel, SectionCard } from './section-card';

/** Which sections a viewer may see; a public share link can switch any of them off. */
export interface TrafficFeatures {
    stats: boolean;
    graph: boolean;
    pages: boolean;
    sources: boolean;
    environment: boolean;
    geography: boolean;
}

const ALL_FEATURES: TrafficFeatures = {
    stats: true,
    graph: true,
    pages: true,
    sources: true,
    environment: true,
    geography: true,
};

/** Query-key segment (`['analytics', <endpoint>, ...]`) of everything this view fetches. */
const TRAFFIC_ENDPOINTS = ['stats', 'chart', 'metrics', 'countries', 'cities'];

/** While live, re-read the range (moving its end to "now") this often. */
const LIVE_REFRESH_MS = 30_000;

/** Stored referrers are full URLs; show the host and path, and name the empty case. */
const renderReferrer = (value: string) =>
    value === 'Unknown'
        ? 'Direct / none'
        : value.replace(/^https?:\/\//, '').replace(/\/$/, '');

/**
 * The traffic dashboard for one website (or one public share link): toolbar,
 * overview tiles, pageviews chart and the breakdown tables.
 */
export function TrafficAnalytics({
    scope,
    features = ALL_FEATURES,
}: {
    scope: AnalyticsScope;
    features?: TrafficFeatures;
}) {
    const [filter, setFilter] = useState('7d');
    const [live, setLive] = useState(false);
    // Presets are relative to "now", so a refresh has to move the range's end.
    const [now, setNow] = useState(() => Date.now());
    const range = useMemo(
        () => getDateRangeFromFilter(filter, new Date(now)),
        [filter, now],
    );

    useEffect(() => {
        if (!live) return;
        const id = setInterval(() => setNow(Date.now()), LIVE_REFRESH_MS);
        return () => clearInterval(id);
    }, [live]);

    const fetching =
        useIsFetching({
            predicate: (q) =>
                TRAFFIC_ENDPOINTS.includes(q.queryKey[1] as string),
        }) > 0;

    const interval: BucketInterval = filter === '24h' ? 'hour' : 'day';
    const stats = useStats(scope, range, features.stats);
    const chart = useChartData(scope, range, interval, features.graph);
    const series = useMemo(
        () =>
            features.graph
                ? fillGaps(chart.data ?? [], interval, range, filter === 'all')
                : undefined,
        [features.graph, chart.data, interval, range, filter],
    );

    return (
        <div className='@container space-y-4 animate-in fade-in duration-500'>
            <div className='flex flex-wrap items-center justify-end gap-2'>
                <DateFilter
                    value={filter}
                    onValueChange={(value) => {
                        setFilter(value);
                        setNow(Date.now());
                    }}
                />
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setLive((l) => !l)}
                    title={
                        live
                            ? `Refreshing every ${LIVE_REFRESH_MS / 1000}s, click to pause`
                            : 'Click to refresh automatically'
                    }
                >
                    {live ? <Pause /> : <Play />}
                    {live ? 'Live' : 'Paused'}
                </Button>
                <Button
                    variant='outline'
                    size='icon-sm'
                    onClick={() => setNow(Date.now())}
                    title='Refresh data'
                >
                    <RefreshCcw className={cn(fetching && 'animate-spin')} />
                </Button>
            </div>

            {features.stats && (
                <SectionCard title='Overview' stale={stats.isPlaceholderData}>
                    <OverviewCard
                        stats={stats.data}
                        series={series}
                        loading={stats.isLoading}
                    />
                </SectionCard>
            )}

            {features.graph && (
                <SectionCard
                    title='Pageviews'
                    actions={<ChartLegend />}
                    stale={chart.isPlaceholderData}
                >
                    <Panel>
                        <AnalyticsChart
                            data={series ?? []}
                            interval={interval}
                            isLoading={chart.isLoading}
                        />
                    </Panel>
                </SectionCard>
            )}

            {features.pages && (
                <MetricTableCard
                    scope={scope}
                    range={range}
                    metric='url'
                    title='Top pages'
                    nameLabel='Path'
                    mono
                />
            )}

            {features.geography && <LocationsCard scope={scope} range={range} />}

            {(features.environment || features.sources) && (
                <div className='grid gap-4 @4xl:grid-cols-2 @4xl:[&>*:only-child]:col-span-2'>
                    {features.environment && (
                        <DeviceCard scope={scope} range={range} />
                    )}
                    {features.environment && (
                        <MetricTableCard
                            scope={scope}
                            range={range}
                            metric='browser'
                            title='Browsers'
                            nameLabel='Browser'
                        />
                    )}
                    {features.sources && (
                        <MetricTableCard
                            scope={scope}
                            range={range}
                            metric='referrer'
                            title='Referrers'
                            nameLabel='Source'
                            renderName={renderReferrer}
                        />
                    )}
                    {features.environment && (
                        <MetricTableCard
                            scope={scope}
                            range={range}
                            metric='os'
                            title='Operating systems'
                            nameLabel='System'
                        />
                    )}
                </div>
            )}

            {features.environment && (
                <MetricTableCard
                    scope={scope}
                    range={range}
                    metric='user_agent'
                    title='Top user agents'
                    nameLabel='Name'
                    mono
                />
            )}
        </div>
    );
}
