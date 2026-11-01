import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetrics, type AnalyticsScope } from '@/hooks/use-analytics';
import { formatCompact } from '@/lib/format';
import type { DateRange, MetricData } from '@/types/api';
import { EmptyState, Panel, SectionCard } from './section-card';

const colorFor = (i: number) => `var(--color-chart-${(i % 5) + 1})`;

/** Views split by device class (desktop / mobile / tablet / tv), as a donut with a legend. */
export function DeviceCard({
    scope,
    range,
}: {
    scope: AnalyticsScope;
    range: DateRange;
}) {
    const { data, isLoading, isPlaceholderData } = useMetrics(
        scope,
        'device_type',
        range,
        10,
    );
    const total = useMemo(
        () => (data ?? []).reduce((sum, d) => sum + d.count, 0),
        [data],
    );

    return (
        <SectionCard title='Devices' stale={isPlaceholderData}>
            <Panel className='min-h-64'>
                {isLoading ? (
                    <div className='flex h-64 items-center justify-center'>
                        <Skeleton className='size-36 rounded-full' />
                    </div>
                ) : !data || data.length === 0 ? (
                    <EmptyState hint='No device data for the selected range.' />
                ) : (
                    <div className='flex flex-col items-center gap-4 p-4'>
                        <div className='relative h-40 w-40'>
                            <ResponsiveContainer width='100%' height='100%'>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey='count'
                                        nameKey='value'
                                        innerRadius='64%'
                                        outerRadius='92%'
                                        paddingAngle={2}
                                        stroke='none'
                                        isAnimationActive={false}
                                    >
                                        {data.map((d, i) => (
                                            <Cell key={d.value} fill={colorFor(i)} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            const row = payload?.[0]?.payload as
                                                | MetricData
                                                | undefined;
                                            if (!active || !row) return null;
                                            return (
                                                <div className='rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md'>
                                                    <span className='capitalize'>
                                                        {row.value}
                                                    </span>
                                                    :{' '}
                                                    <span className='font-semibold tabular-nums'>
                                                        {formatCompact(row.count)}
                                                    </span>{' '}
                                                    views
                                                </div>
                                            );
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
                                <span className='text-xl font-semibold tabular-nums'>
                                    {formatCompact(total)}
                                </span>
                                <span className='text-xs text-muted-foreground'>
                                    views
                                </span>
                            </div>
                        </div>
                        <ul className='flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs'>
                            {data.map((d, i) => (
                                <li key={d.value} className='flex items-center gap-1.5'>
                                    <span
                                        className='size-2 rounded-full'
                                        style={{ background: colorFor(i) }}
                                    />
                                    <span className='capitalize'>{d.value}</span>
                                    <span className='tabular-nums text-muted-foreground'>
                                        {total ? Math.round((d.count / total) * 100) : 0}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Panel>
        </SectionCard>
    );
}
