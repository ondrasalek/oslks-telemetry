import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicMetrics } from '@/hooks/use-analytics';
import type { MetricType, DateRange } from '@/types/api';
import { cn } from '@/lib/utils';

interface TabInfo {
    label: string;
    value: MetricType;
}

interface PublicMetricsCardProps {
    title: string;
    shareId: string;
    range: DateRange;
    tabs: TabInfo[];
}

export function PublicMetricsCard({
    title,
    shareId,
    range,
    tabs,
}: PublicMetricsCardProps) {
    const [activeTab, setActiveTab] = useState<MetricType>(tabs[0].value);

    const { data: metrics, isLoading } = usePublicMetrics(
        shareId,
        activeTab,
        range,
    );

    // Calculate total for percentage bars
    const totalCount = metrics?.reduce((acc, curr) => acc + curr.count, 0) || 0;

    return (
        <Card className='flex flex-col h-full'>
            <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>
                    {title}
                </CardTitle>
                {tabs.length > 1 && (
                    <div className='flex gap-4 border-b pt-2'>
                        {tabs.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={cn(
                                    'pb-1 text-sm font-medium transition-colors hover:text-primary',
                                    activeTab === tab.value
                                        ? 'border-b-2 border-primary text-primary'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className='flex-1 overflow-y-auto'>
                <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2'>
                    <span className='capitalize'>
                        {tabs.find((t) => t.value === activeTab)?.label ||
                            activeTab}
                    </span>
                    <span>Visitors</span>
                </div>

                {isLoading ? (
                    <div className='space-y-3 mt-4'>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className='flex items-center justify-between'
                            >
                                <Skeleton className='h-4 w-3/4' />
                                <Skeleton className='h-4 w-8' />
                            </div>
                        ))}
                    </div>
                ) : !metrics || metrics.length === 0 ? (
                    <div className='flex mt-8 items-center justify-center'>
                        <p className='text-sm text-muted-foreground'>
                            No data available.
                        </p>
                    </div>
                ) : (
                    <div className='space-y-3'>
                        {metrics.map((metric, i) => {
                            const percentage =
                                totalCount > 0
                                    ? (metric.count / totalCount) * 100
                                    : 0;
                            return (
                                <div
                                    key={i}
                                    className='relative flex items-center justify-between text-sm py-1'
                                >
                                    {/* Background percentage bar */}
                                    <div
                                        className='absolute left-0 top-0 h-full rounded bg-primary/10'
                                        style={{ width: `${percentage}%` }}
                                    />

                                    <div className='relative z-10 flex items-center gap-2 px-1 truncate max-w-[75%]'>
                                        <span
                                            className='truncate'
                                            title={metric.value}
                                        >
                                            {metric.value}
                                        </span>
                                    </div>
                                    <div className='relative z-10 flex items-center justify-end gap-3 px-1'>
                                        <span className='font-medium'>
                                            {metric.count}
                                        </span>
                                        <span className='text-muted-foreground text-xs w-8 text-right'>
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
