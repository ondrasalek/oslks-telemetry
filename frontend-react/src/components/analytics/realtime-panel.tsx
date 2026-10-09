import { lazy, Suspense, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicRealtime, useRealtime } from '@/hooks/use-analytics';
import type { RealtimeData } from '@/types/api';
import { useLiveFeed, type LiveVisit } from '@/hooks/use-live-feed';
import { countryFlag, countryName } from '@/lib/countries';

const WorldMap = lazy(() => import('./world-map'));

function Stat({
    label,
    value,
    loading,
}: {
    label: string;
    value: number;
    loading: boolean;
}) {
    return (
        <Card>
            <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className='h-8 w-16' />
                ) : (
                    <div className='text-2xl font-bold'>{value}</div>
                )}
            </CardContent>
        </Card>
    );
}

function Ranked({
    title,
    rows,
    render,
    loading,
}: {
    title: string;
    rows: { value: string; visitors: number }[];
    render: (value: string) => string;
    loading: boolean;
}) {
    const max = Math.max(1, ...rows.map((r) => r.visitors));
    return (
        <Card className='h-full'>
            <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className='h-5 w-full' />
                    ))
                ) : rows.length === 0 ? (
                    <p className='py-4 text-center text-sm text-muted-foreground'>
                        No activity in the last 30 minutes.
                    </p>
                ) : (
                    rows.map((row) => (
                        <div key={row.value} className='relative text-sm'>
                            <div
                                className='absolute inset-y-0 left-0 rounded bg-primary/10'
                                style={{
                                    width: `${(row.visitors / max) * 100}%`,
                                }}
                            />
                            <div className='relative flex items-center justify-between px-2 py-1'>
                                <span className='truncate pr-2'>
                                    {render(row.value)}
                                </span>
                                <span className='font-medium tabular-nums'>
                                    {row.visitors}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function LiveFeed({
    visits,
    connected,
}: {
    visits: LiveVisit[];
    connected: boolean;
}) {
    return (
        <Card>
            <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                    <span className='relative flex h-2.5 w-2.5'>
                        {connected && (
                            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75' />
                        )}
                        <span
                            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                        />
                    </span>
                    Live
                    <span className='text-xs font-normal text-muted-foreground'>
                        {connected ? 'connected' : 'connecting…'}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {visits.length === 0 ? (
                    <p className='py-4 text-center text-sm text-muted-foreground'>
                        Waiting for the next visit…
                    </p>
                ) : (
                    <ul className='divide-y text-sm'>
                        {visits.slice(0, 10).map((v) => (
                            <li
                                key={v.id}
                                className='flex items-center justify-between gap-3 py-1.5 animate-in fade-in slide-in-from-top-1 duration-300'
                            >
                                <span className='min-w-0 truncate'>
                                    <span className='mr-2'>
                                        {v.country
                                            ? countryFlag(v.country)
                                            : '🌐'}
                                    </span>
                                    <span className='font-medium'>
                                        {v.url ??
                                            (v.type === 'pageview'
                                                ? 'Pageview'
                                                : v.name || v.type)}
                                    </span>
                                    {(v.city || v.country) && (
                                        <span className='ml-2 text-muted-foreground'>
                                            {[
                                                v.city,
                                                v.country &&
                                                    countryName(v.country),
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </span>
                                    )}
                                </span>
                                <span className='shrink-0 tabular-nums text-xs text-muted-foreground'>
                                    {format(parseISO(v.at), 'HH:mm:ss')}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function RealtimeView({
    data,
    isLoading,
    showPages = true,
    showCountries = true,
    live,
}: {
    data: RealtimeData | undefined;
    isLoading: boolean;
    /** Public pages may hide sections the owner chose not to share. */
    showPages?: boolean;
    showCountries?: boolean;
    /** Latest visits pushed over the live stream, newest first. */
    live: { visits: LiveVisit[]; connected: boolean };
}) {
    const pulses = live.visits
        .filter((v) => v.lat != null && v.lng != null)
        .slice(0, 10)
        .map((v) => ({ id: v.id, lat: v.lat as number, lng: v.lng as number }));

    return (
        <div className='space-y-6 animate-in fade-in duration-500'>
            <div className='grid gap-4 sm:grid-cols-3'>
                <Stat
                    label='Active now (5 min)'
                    value={data?.active ?? 0}
                    loading={isLoading}
                />
                <Stat
                    label='Visitors (30 min)'
                    value={data?.visitors ?? 0}
                    loading={isLoading}
                />
                <Stat
                    label='Pageviews (30 min)'
                    value={data?.views ?? 0}
                    loading={isLoading}
                />
            </div>

            <LiveFeed visits={live.visits} connected={live.connected} />

            <Card>
                <CardHeader className='pb-2'>
                    <CardTitle className='text-base font-semibold'>
                        Visitors per minute
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='h-[140px] w-full'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart
                                data={data?.per_minute ?? []}
                                margin={{
                                    top: 4,
                                    right: 4,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <XAxis
                                    dataKey='timestamp'
                                    tickFormatter={(t: string) =>
                                        format(parseISO(t), 'HH:mm')
                                    }
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={32}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    width={28}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    labelFormatter={(t) =>
                                        format(parseISO(String(t)), 'HH:mm')
                                    }
                                    formatter={(v) => [v, 'Visitors']}
                                />
                                <Bar
                                    dataKey='visitors'
                                    fill='var(--primary)'
                                    radius={[2, 2, 0, 0]}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {(showPages || showCountries) && (
                <div className='grid gap-6 md:grid-cols-2'>
                    {showPages && (
                        <Ranked
                            title='Top pages'
                            rows={data?.pages ?? []}
                            render={(v) => v}
                            loading={isLoading}
                        />
                    )}
                    {showCountries && (
                        <Ranked
                            title='Top countries'
                            rows={(data?.countries ?? []).slice(0, 8)}
                            render={(v) =>
                                `${countryFlag(v)} ${countryName(v)}`.trim()
                            }
                            loading={isLoading}
                        />
                    )}
                </div>
            )}

            {showCountries && (
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-base font-semibold'>
                            Where they are right now
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense
                            fallback={
                                <Skeleton className='aspect-[2/1] w-full' />
                            }
                        >
                            <WorldMap
                                data={data?.countries ?? []}
                                cities={data?.cities ?? []}
                                pulses={pulses}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/**
 * Counters refresh on a 10s poll; each pushed visit also nudges them (at most every 3s),
 * so the numbers keep up with the live list.
 */
function useRefreshOnVisit(
    visits: LiveVisit[],
    scope: 'private' | 'public',
    id: string,
) {
    const queryClient = useQueryClient();
    const lastRefresh = useRef(0);
    const latestId = visits[0]?.id;

    useEffect(() => {
        if (latestId === undefined) return;
        const now = Date.now();
        if (now - lastRefresh.current < 3000) return;
        lastRefresh.current = now;
        queryClient.invalidateQueries({
            queryKey:
                scope === 'public'
                    ? ['analytics', 'public', 'realtime', id]
                    : ['analytics', 'realtime', id],
        });
    }, [latestId, scope, id, queryClient]);
}

/** Live view of the last 30 minutes: 10s poll plus a pushed stream of visits. */
export function RealtimePanel({ websiteId }: { websiteId: string }) {
    const { data, isLoading } = useRealtime(websiteId);
    const live = useLiveFeed(`/api/analytics/${websiteId}/live`);
    useRefreshOnVisit(live.visits, 'private', websiteId);
    return <RealtimeView data={data} isLoading={isLoading} live={live} />;
}

/** Same view for a public share link; honours what the owner chose to share. */
export function PublicRealtimePanel({
    shareId,
    showPages,
    showCountries,
}: {
    shareId: string;
    showPages: boolean;
    showCountries: boolean;
}) {
    const { data, isLoading } = usePublicRealtime(shareId);
    const live = useLiveFeed(`/api/analytics/shared/${shareId}/live`);
    useRefreshOnVisit(live.visits, 'public', shareId);
    return (
        <RealtimeView
            data={data}
            isLoading={isLoading}
            showPages={showPages}
            showCountries={showCountries}
            live={live}
        />
    );
}
