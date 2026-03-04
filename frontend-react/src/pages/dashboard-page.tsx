import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebsites, useTogglePinWebsite } from '@/hooks/use-websites';
import { useTeamStats } from '@/hooks/use-analytics';
import { useCurrentUser } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    Users,
    Globe,
    ArrowUpRight,
    Star,
    RefreshCcw,
} from 'lucide-react';
import { DateFilter } from '@/components/analytics/date-filter';
import { getDateRangeFromFilter } from '@/lib/dates';

export function DashboardPage() {
    const { data: user } = useCurrentUser();
    const { data: websites, isLoading } = useWebsites();
    const togglePin = useTogglePinWebsite();
    const queryClient = useQueryClient();
    const [dateFilter, setDateFilter] = useState<string>('30d');

    const { from, to } = useMemo(() => {
        return getDateRangeFromFilter(dateFilter);
    }, [dateFilter]);

    const { data: teamStats, isLoading: statsLoading } = useTeamStats(
        user?.team_id ?? '',
        { from, to },
    );

    return (
        <div className='space-y-6'>
            <div className='flex items-end justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        Overview
                    </h1>
                    <p className='text-muted-foreground'>
                        Your analytics at a glance.
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        onClick={() =>
                            queryClient.invalidateQueries({
                                queryKey: ['analytics'],
                            })
                        }
                        title='Refresh Data'
                    >
                        <RefreshCcw size={16} />
                    </Button>
                    <DateFilter
                        value={dateFilter}
                        onValueChange={setDateFilter}
                    />
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <StatCard
                    title='Total Pageviews'
                    value={teamStats?.pageviews ?? 0}
                    icon={Activity}
                    loading={statsLoading}
                />
                <StatCard
                    title='Total Visitors'
                    value={teamStats?.visitors ?? 0}
                    icon={Users}
                    loading={statsLoading}
                />
                <StatCard
                    title='Avg. Bounce Rate'
                    value={
                        ((teamStats?.bounce_rate ?? 0) * 100).toFixed(1) + '%'
                    }
                    icon={ArrowUpRight}
                    loading={statsLoading}
                />
                <StatCard
                    title='Avg. Interaction'
                    value={
                        Math.round((teamStats?.avg_duration ?? 0) / 1000) + 's'
                    }
                    icon={Globe}
                    loading={statsLoading}
                />
            </div>

            {/* Websites list summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Websites</CardTitle>
                    <CardDescription>
                        Select a website to view detailed analytics.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className='space-y-3'>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className='flex items-center justify-between rounded-md border border-border p-3'
                                >
                                    <div className='space-y-2'>
                                        <Skeleton className='h-5 w-32' />
                                        <Skeleton className='h-4 w-48' />
                                    </div>
                                    <div className='flex items-center gap-3'>
                                        <Skeleton className='h-5 w-16 rounded-full' />
                                        <Skeleton className='h-4 w-4' />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : websites && websites.length > 0 ? (
                        <div className='space-y-2'>
                            {websites.map((site) => (
                                <Link
                                    key={site.id}
                                    to={`/dashboard/sites/${site.id}`}
                                    className='flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50 animate-in fade-in duration-500'
                                >
                                    <div className='flex items-center gap-4'>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                togglePin.mutate(site.id);
                                            }}
                                            className='text-muted-foreground hover:text-primary transition-colors'
                                        >
                                            <Star
                                                size={18}
                                                className={
                                                    site.is_pinned
                                                        ? 'fill-primary text-primary'
                                                        : ''
                                                }
                                            />
                                        </button>
                                        <div>
                                            <p className='font-medium'>
                                                {site.name ?? site.domain}
                                            </p>
                                            <p className='text-sm text-muted-foreground'>
                                                {site.domain}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-3'>
                                        <Badge
                                            variant={
                                                site.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {site.status ?? 'unknown'}
                                        </Badge>
                                        <ArrowUpRight className='h-4 w-4 text-muted-foreground' />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className='text-sm text-muted-foreground'>
                            No websites added yet. Go to{' '}
                            <Link
                                to='/dashboard/sites'
                                className='font-medium text-primary hover:underline'
                            >
                                Websites
                            </Link>{' '}
                            to add one.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    loading,
}: {
    title: string;
    value: string | number;
    icon: any;
    loading: boolean;
}) {
    return (
        <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>{title}</CardTitle>
                <Icon className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className='h-7 w-20' />
                ) : (
                    <div className='text-2xl font-bold animate-in fade-in duration-500'>
                        {value}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
