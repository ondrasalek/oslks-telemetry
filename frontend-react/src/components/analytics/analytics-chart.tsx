import React from 'react';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ChartDataPoint } from '@/types/api';

interface AnalyticsChartProps {
    data: ChartDataPoint[];
    isLoading?: boolean;
}

export function AnalyticsChart({ data, isLoading }: AnalyticsChartProps) {
    const isHourly = React.useMemo(() => {
        if (!data || data.length < 2) return false;
        const diff =
            new Date(data[1].timestamp).getTime() -
            new Date(data[0].timestamp).getTime();
        return diff <= 60 * 60 * 1000; // 1 hour or less
    }, [data]);
    if (isLoading) {
        return (
            <div className='flex h-[350px] w-full items-center justify-center rounded-md border border-dashed'>
                <p className='text-sm text-muted-foreground'>
                    Loading chart...
                </p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className='flex h-[350px] w-full items-center justify-center rounded-md border border-dashed'>
                <p className='text-sm text-muted-foreground'>
                    No data available for this range.
                </p>
            </div>
        );
    }

    return (
        <div className='h-[350px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient
                            id='colorViews'
                            x1='0'
                            y1='0'
                            x2='0'
                            y2='1'
                        >
                            <stop
                                offset='5%'
                                stopColor='var(--color-chart-1)'
                                stopOpacity={0.5}
                            />
                            <stop
                                offset='95%'
                                stopColor='var(--color-chart-1)'
                                stopOpacity={0}
                            />
                        </linearGradient>
                        <linearGradient
                            id='colorVisitors'
                            x1='0'
                            y1='0'
                            x2='0'
                            y2='1'
                        >
                            <stop
                                offset='5%'
                                stopColor='var(--color-chart-2)'
                                stopOpacity={0.5}
                            />
                            <stop
                                offset='95%'
                                stopColor='var(--color-chart-2)'
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray='3 3'
                        vertical={false}
                        stroke='var(--color-border)'
                    />
                    <XAxis
                        dataKey='timestamp'
                        tickFormatter={(str) =>
                            format(parseISO(str), isHourly ? 'HH:mm' : 'MMM d')
                        }
                        minTickGap={30}
                        tick={{
                            fontSize: 12,
                            fill: 'var(--color-muted-foreground)',
                        }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{
                            fontSize: 12,
                            fill: 'var(--color-muted-foreground)',
                        }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className='rounded-lg border border-border bg-background p-3 shadow-md'>
                                        <p className='mb-2 text-xs font-medium text-muted-foreground'>
                                            {label && typeof label === 'string'
                                                ? format(
                                                      parseISO(label),
                                                      isHourly
                                                          ? 'MMM d, yyyy - HH:mm'
                                                          : 'EEEE, MMM d, yyyy',
                                                  )
                                                : label}
                                        </p>
                                        <div className='space-y-1'>
                                            <div className='flex items-center gap-2'>
                                                <div className='h-2 w-2 rounded-full bg-(--color-chart-1)' />
                                                <span className='text-sm font-semibold'>
                                                    Views: {payload[0].value}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <div className='h-2 w-2 rounded-full bg-(--color-chart-2)' />
                                                <span className='text-sm font-semibold'>
                                                    Visitors: {payload[1].value}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type='monotone'
                        dataKey='views'
                        stroke='var(--color-chart-1)'
                        strokeWidth={2}
                        fillOpacity={1}
                        fill='url(#colorViews)'
                    />
                    <Area
                        type='monotone'
                        dataKey='visitors'
                        stroke='var(--color-chart-2)'
                        strokeWidth={2}
                        fillOpacity={1}
                        fill='url(#colorVisitors)'
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
