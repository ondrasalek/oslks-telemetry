import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
    formatCompact,
    formatDuration,
    formatPercent,
} from '@/lib/format';
import type { ChartDataPoint, Stats } from '@/types/api';
import { Panel } from './section-card';

function Sparkline({ values, color }: { values: number[]; color: string }) {
    // useId() output can contain characters that break `url(#id)` references.
    const id = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const data = values.map((v, i) => ({ i, v }));
    return (
        <div className='h-12 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                    data={data}
                    margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id={id} x1='0' y1='0' x2='0' y2='1'>
                            <stop
                                offset='0%'
                                stopColor={color}
                                stopOpacity={0.45}
                            />
                            <stop
                                offset='100%'
                                stopColor={color}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <Area
                        type='monotone'
                        dataKey='v'
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#${id})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

interface Tile {
    label: string;
    value: string;
    color: string;
    series: number[];
}

function buildTiles(stats: Stats | undefined, series: ChartDataPoint[]): Tile[] {
    const pagesPerVisit =
        stats && stats.visitors ? stats.pageviews / stats.visitors : 0;
    return [
        {
            label: 'Pageviews',
            value: formatCompact(stats?.pageviews ?? 0),
            color: 'var(--color-chart-1)',
            series: series.map((p) => p.views),
        },
        {
            label: 'Unique visitors',
            value: formatCompact(stats?.visitors ?? 0),
            color: 'var(--color-chart-2)',
            series: series.map((p) => p.visitors),
        },
        {
            label: 'Pages / visit',
            value: pagesPerVisit.toFixed(1),
            color: 'var(--color-chart-3)',
            series: series.map((p) => (p.visitors ? p.views / p.visitors : 0)),
        },
        {
            label: 'Bounce rate',
            value: formatPercent(Number(stats?.bounce_rate ?? 0)),
            color: 'var(--color-chart-4)',
            series: series.map((p) => p.bounce_rate ?? 0),
        },
        {
            label: 'Avg. duration',
            value: formatDuration(Number(stats?.avg_duration ?? 0)),
            color: 'var(--color-chart-5)',
            series: series.map((p) => p.avg_duration ?? 0),
        },
    ];
}

/**
 * The headline numbers as one strip of tiles, each with a sparkline of the same
 * metric over the selected range. Sparklines are skipped when no series is given
 * (a public share that does not expose the graph).
 */
export function OverviewCard({
    stats,
    series,
    loading,
}: {
    stats: Stats | undefined;
    series: ChartDataPoint[] | undefined;
    loading: boolean;
}) {
    const tiles = buildTiles(stats, series ?? []);
    const showSparklines = !!series && series.length > 1;

    return (
        <Panel className='grid grid-cols-2 gap-y-3 overflow-hidden pt-4 sm:grid-cols-3 lg:grid-cols-5'>
            {tiles.map((tile) => (
                <div
                    key={tile.label}
                    className='flex min-w-0 flex-col justify-between gap-3'
                >
                    <div className='px-4'>
                        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                            {tile.label}
                        </p>
                        {loading ? (
                            <Skeleton className='mt-1.5 h-8 w-20' />
                        ) : (
                            <p className='mt-1 truncate text-2xl font-semibold tabular-nums'>
                                {tile.value}
                            </p>
                        )}
                    </div>
                    {showSparklines ? (
                        <Sparkline values={tile.series} color={tile.color} />
                    ) : (
                        <div className='h-3' />
                    )}
                </div>
            ))}
        </Panel>
    );
}
