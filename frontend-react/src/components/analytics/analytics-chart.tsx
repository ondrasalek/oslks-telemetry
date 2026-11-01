import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
    formatBucket,
    formatCompact,
    type BucketInterval,
} from '@/lib/format';
import type { ChartDataPoint } from '@/types/api';
import { EmptyState } from './section-card';

const SERIES = [
    { key: 'views', label: 'Pageviews', color: 'var(--color-chart-1)' },
    { key: 'visitors', label: 'Visitors', color: 'var(--color-chart-2)' },
] as const;

const tick = { fontSize: 11, fill: 'var(--color-muted-foreground)' };

export function ChartLegend() {
    return (
        <ul className='flex items-center gap-4 text-xs text-muted-foreground'>
            {SERIES.map((s) => (
                <li key={s.key} className='flex items-center gap-1.5'>
                    <span
                        className='size-2 rounded-full'
                        style={{ background: s.color }}
                    />
                    {s.label}
                </li>
            ))}
        </ul>
    );
}

interface AnalyticsChartProps {
    data: ChartDataPoint[];
    interval: BucketInterval;
    isLoading?: boolean;
}

/** Pageviews and visitors over the selected range. Expects gap-filled data. */
export function AnalyticsChart({
    data,
    interval,
    isLoading,
}: AnalyticsChartProps) {
    if (isLoading) return <Skeleton className='h-[260px] w-full' />;

    if (data.length === 0) {
        return <EmptyState hint='No traffic data for the selected range.' />;
    }

    const quiet = data.every((p) => p.views === 0);

    return (
        <div className='relative h-[260px] w-full p-2'>
            <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                    <defs>
                        {SERIES.map((s) => (
                            <linearGradient
                                key={s.key}
                                id={`traffic-${s.key}`}
                                x1='0'
                                y1='0'
                                x2='0'
                                y2='1'
                            >
                                <stop
                                    offset='0%'
                                    stopColor={s.color}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset='100%'
                                    stopColor={s.color}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid
                        vertical={false}
                        stroke='var(--color-border)'
                    />
                    <XAxis
                        dataKey='timestamp'
                        tickFormatter={(ts: string) => formatBucket(ts, interval)}
                        minTickGap={48}
                        tick={tick}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        width={36}
                        tickCount={4}
                        allowDecimals={false}
                        tickFormatter={formatCompact}
                        tick={tick}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{
                            stroke: 'var(--color-muted-foreground)',
                            strokeOpacity: 0.4,
                        }}
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <div className='rounded-lg border bg-popover p-3 text-popover-foreground shadow-md'>
                                    <p className='mb-2 text-xs font-medium text-muted-foreground'>
                                        {typeof label === 'string'
                                            ? formatBucket(label, interval, true)
                                            : label}
                                    </p>
                                    <div className='space-y-1'>
                                        {SERIES.map((s) => {
                                            const item = payload.find(
                                                (p) => p.dataKey === s.key,
                                            );
                                            if (!item) return null;
                                            return (
                                                <div
                                                    key={s.key}
                                                    className='flex items-center gap-2 text-sm'
                                                >
                                                    <span
                                                        className='size-2 rounded-full'
                                                        style={{
                                                            background: s.color,
                                                        }}
                                                    />
                                                    <span className='text-muted-foreground'>
                                                        {s.label}
                                                    </span>
                                                    <span className='ml-auto pl-4 font-semibold tabular-nums'>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }}
                    />
                    {SERIES.map((s) => (
                        <Area
                            key={s.key}
                            type='monotone'
                            dataKey={s.key}
                            stroke={s.color}
                            strokeWidth={2}
                            fill={`url(#traffic-${s.key})`}
                            dot={false}
                            isAnimationActive={false}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
            {quiet && (
                <p className='pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-muted-foreground'>
                    No traffic in this range
                </p>
            )}
        </div>
    );
}
