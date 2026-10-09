import { lazy, Suspense } from 'react';
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

function RealtimeView({
    data,
    isLoading,
    showPages = true,
    showCountries = true,
}: {
    data: RealtimeData | undefined;
    isLoading: boolean;
    /** Public pages may hide sections the owner chose not to share. */
    showPages?: boolean;
    showCountries?: boolean;
}) {
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
                            <WorldMap data={data?.countries ?? []} />
                        </Suspense>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/** Live view of the last 30 minutes; refreshes every 10 seconds. */
export function RealtimePanel({ websiteId }: { websiteId: string }) {
    const { data, isLoading } = useRealtime(websiteId);
    return <RealtimeView data={data} isLoading={isLoading} />;
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
    return (
        <RealtimeView
            data={data}
            isLoading={isLoading}
            showPages={showPages}
            showCountries={showCountries}
        />
    );
}
