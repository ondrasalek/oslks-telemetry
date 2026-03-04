import { useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { usePublicWebsite } from '@/hooks/use-websites';
import { usePublicStats, usePublicChartData } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import { PublicMetricsCard } from '@/components/analytics/public-metrics-card';
import { DateFilter } from '@/components/analytics/date-filter';
import { getDateRangeFromFilter } from '@/lib/dates';
import { Globe } from 'lucide-react';

export function PublicSharePage() {
    const { share_id } = useParams<{ share_id: string }>();
    const {
        data: website,
        isLoading,
        error,
    } = usePublicWebsite(share_id ?? '');

    const [dateFilter, setDateFilter] = useState<string>('7d');

    const { from, to } = useMemo(() => {
        return getDateRangeFromFilter(dateFilter);
    }, [dateFilter]);

    const { data: stats, isLoading: statsLoading } = usePublicStats(
        share_id ?? '',
        {
            from,
            to,
        },
    );

    const chartInterval = dateFilter === '24h' ? 'hour' : 'day';
    const { data: chartData, isLoading: chartLoading } = usePublicChartData(
        share_id ?? '',
        {
            from,
            to,
        },
        chartInterval,
    );

    if (isLoading) {
        return (
            <div className='max-w-6xl mx-auto p-6 space-y-6 min-h-screen'>
                <div className='space-y-2'>
                    <Skeleton className='h-8 w-64' />
                    <Skeleton className='h-4 w-48' />
                </div>
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className='pb-2'>
                                <Skeleton className='h-4 w-24' />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className='h-8 w-16' />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!website || error) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <Card className='max-w-md mx-auto'>
                    <CardContent className='flex flex-col items-center justify-center p-12 text-center'>
                        <Globe className='h-12 w-12 text-muted-foreground/50 mb-4' />
                        <h2 className='text-xl font-semibold mb-2'>
                            Analytics not found
                        </h2>
                        <p className='text-muted-foreground'>
                            This analytics page is either private or does not
                            exist.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isFeatureEnabled = (key: string) => {
        if (
            !website.share_config ||
            Object.keys(website.share_config).length === 0
        ) {
            return true;
        }
        return !!website.share_config[key];
    };

    return (
        <div className='min-h-screen bg-background/50'>
            {/* Header / Navbar equivalent strictly for public share */}
            <div className='border-b bg-background'>
                <div className='max-w-6xl mx-auto px-6 h-16 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        {website.icon_url ? (
                            <img
                                src={website.icon_url}
                                alt={`${website.domain} favicon`}
                                className='w-8 h-8 rounded-sm'
                            />
                        ) : (
                            <div className='w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary'>
                                <Globe size={16} />
                            </div>
                        )}
                        <div>
                            <h1 className='text-lg font-semibold tracking-tight leading-none'>
                                {website.name || website.domain}
                            </h1>
                            <p className='text-xs text-muted-foreground mt-1'>
                                {website.domain} • Publicly Shared
                            </p>
                        </div>
                    </div>
                    <div>
                        <DateFilter
                            value={dateFilter}
                            onValueChange={setDateFilter}
                        />
                    </div>
                </div>
            </div>

            <div className='max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in duration-500'>
                {/* Stats Grid */}
                {isFeatureEnabled('stats') && (
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-sm font-medium text-muted-foreground'>
                                    Pageviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skeleton className='h-8 w-24' />
                                ) : (
                                    <div className='text-2xl font-bold'>
                                        {stats?.pageviews ?? 0}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-sm font-medium text-muted-foreground'>
                                    Visitors
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skeleton className='h-8 w-24' />
                                ) : (
                                    <div className='text-2xl font-bold'>
                                        {stats?.visitors ?? 0}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-sm font-medium text-muted-foreground'>
                                    Bounce Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skeleton className='h-8 w-24' />
                                ) : (
                                    <div className='text-2xl font-bold'>
                                        {stats?.bounce_rate ?? 0}%
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-sm font-medium text-muted-foreground'>
                                    Avg. Duration
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Skeleton className='h-8 w-24' />
                                ) : (
                                    <div className='text-2xl font-bold'>
                                        {stats?.avg_duration ?? 0}s
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main Activity Chart */}
                {isFeatureEnabled('graph') && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnalyticsChart
                                data={chartData ?? []}
                                isLoading={chartLoading}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Detailed Metrics Grid */}
                <div className='grid gap-6 md:grid-cols-2'>
                    {isFeatureEnabled('pages') && (
                        <PublicMetricsCard
                            title='Pages'
                            shareId={share_id!}
                            range={{ from, to }}
                            tabs={[{ label: 'Path', value: 'url' }]}
                        />
                    )}
                    {isFeatureEnabled('sources') && (
                        <PublicMetricsCard
                            title='Sources'
                            shareId={share_id!}
                            range={{ from, to }}
                            tabs={[{ label: 'Referrers', value: 'referrer' }]}
                        />
                    )}
                    {isFeatureEnabled('environment') && (
                        <PublicMetricsCard
                            title='Environment'
                            shareId={share_id!}
                            range={{ from, to }}
                            tabs={[
                                { label: 'Browsers', value: 'browser' },
                                { label: 'OS', value: 'os' },
                                { label: 'Devices', value: 'device_type' },
                            ]}
                        />
                    )}
                    {isFeatureEnabled('geography') && (
                        <PublicMetricsCard
                            title='Geography'
                            shareId={share_id!}
                            range={{ from, to }}
                            tabs={[{ label: 'Countries', value: 'country' }]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
