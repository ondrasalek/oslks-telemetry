import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import React from 'react';
import {
    useWebsite,
    useUpdateWebsite,
    useUpdateWebsiteShare,
    useDeleteWebsite,
    useResetWebsiteData,
    useTransferWebsite,
} from '@/hooks/use-websites';
import { useStats, useChartData } from '@/hooks/use-analytics';
import { useTeams } from '@/hooks/use-teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import { MetricsCard } from '@/components/analytics/metrics-card';
import { DateFilter } from '@/components/analytics/date-filter';
import { getDateRangeFromFilter } from '@/lib/dates';
import {
    Share2,
    Edit,
    ArrowRightLeft,
    RefreshCcw,
    Trash2,
    Copy,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Website } from '@/types/api';

export function SiteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: website, isLoading, isFetching } = useWebsite(id ?? '');
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>(
        'overview',
    );

    const [showEdit, setShowEdit] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [integrationTab, setIntegrationTab] = useState<
        'html' | 'react' | 'nextjs'
    >('html');
    const [dateFilter, setDateFilter] = useState<string>('7d');
    const deleteWebsite = useDeleteWebsite();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { from, to } = useMemo(() => {
        return getDateRangeFromFilter(dateFilter);
    }, [dateFilter]);
    const { data: stats, isLoading: statsLoading } = useStats(id ?? '', {
        from,
        to,
    });
    const chartInterval = dateFilter === '24h' ? 'hour' : 'day';
    const { data: chartData, isLoading: chartLoading } = useChartData(
        id ?? '',
        {
            from,
            to,
        },
        chartInterval,
    );

    if (isLoading || (isFetching && !website)) {
        return (
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                        <Skeleton className='h-8 w-64' />
                        <Skeleton className='h-4 w-48' />
                    </div>
                </div>
                <div className='flex gap-4 border-b pb-px'>
                    <Skeleton className='h-10 w-24' />
                    <Skeleton className='h-10 w-24' />
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

    if (!website) {
        return <p className='text-muted-foreground'>Website not found.</p>;
    }

    const trackingHost = import.meta.env.VITE_APP_URL || window.location.origin;
    const trackingCode = `<script defer data-website-id="${website.id}" data-host-url="${trackingHost}" src="${trackingHost}/assets/v1/lib/j"></script>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(trackingCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className='space-y-6'>
            <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                    {website.icon_url && (
                        <img
                            src={website.icon_url}
                            alt={`${website.domain} favicon`}
                            className='w-8 h-8 rounded-sm'
                        />
                    )}
                    <div>
                        <h1 className='text-2xl font-bold tracking-tight'>
                            {website.name || website.domain}
                        </h1>
                        <p className='text-muted-foreground'>
                            {website.domain}
                        </p>
                    </div>
                </div>
            </div>

            <div className='flex items-center gap-4 py-2 border-b'>
                <div className='flex gap-4 flex-1'>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={cn(
                            'pb-2 mt-2 -mb-2 border-b-2 font-medium transition-colors hover:text-primary',
                            activeTab === 'overview'
                                ? 'border-primary text-primary'
                                : 'text-muted-foreground border-transparent',
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={cn(
                            'pb-2 mt-2 -mb-2 border-b-2 font-medium transition-colors hover:text-primary',
                            activeTab === 'settings'
                                ? 'border-primary text-primary'
                                : 'text-muted-foreground border-transparent',
                        )}
                    >
                        Settings
                    </button>
                </div>
                {activeTab === 'overview' && (
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
                )}
            </div>

            {activeTab === 'overview' ? (
                <div className='space-y-6 animate-in fade-in duration-500'>
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

                    {/* Detailed Metrics Grid */}
                    <div className='grid gap-6 md:grid-cols-2'>
                        <MetricsCard
                            title='Pages'
                            websiteId={website.id}
                            range={{ from, to }}
                            tabs={[{ label: 'Path', value: 'url' }]}
                        />
                        <MetricsCard
                            title='Sources'
                            websiteId={website.id}
                            range={{ from, to }}
                            tabs={[{ label: 'Referrers', value: 'referrer' }]}
                        />
                        <MetricsCard
                            title='Environment'
                            websiteId={website.id}
                            range={{ from, to }}
                            tabs={[
                                { label: 'Browsers', value: 'browser' },
                                { label: 'OS', value: 'os' },
                                { label: 'Devices', value: 'device_type' },
                            ]}
                        />
                        <MetricsCard
                            title='Location'
                            websiteId={website.id}
                            range={{ from, to }}
                            tabs={[{ label: 'Countries', value: 'country' }]}
                        />
                    </div>
                </div>
            ) : (
                <div className='grid gap-6 md:grid-cols-2 animate-in fade-in duration-500'>
                    {/* General Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='font-medium'>
                                        Website Details
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                        Change website name or domain.
                                    </p>
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setShowEdit(true)}
                                >
                                    <Edit className='mr-2 h-4 w-4' />
                                    Edit
                                </Button>
                            </div>
                            <Separator />
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='font-medium'>Public Share</p>
                                    <p className='text-sm text-muted-foreground'>
                                        Manage public analytics sharing link.
                                    </p>
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setShowShare(true)}
                                >
                                    <Share2 className='mr-2 h-4 w-4' />
                                    Share
                                </Button>
                            </div>
                            <Separator />
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='font-medium'>
                                        Transfer Website
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                        Move this website to another team.
                                    </p>
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setShowTransfer(true)}
                                >
                                    <ArrowRightLeft className='mr-2 h-4 w-4' />
                                    Transfer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tracking Code */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tracking Code</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <p className='text-sm text-muted-foreground'>
                                Add this script to the <code>&lt;head&gt;</code>{' '}
                                of your website to start tracking visitors.
                            </p>
                            <div className='relative'>
                                <p className='mb-2 text-sm font-medium'>
                                    ID:{' '}
                                    <code className='rounded bg-muted px-1.5 py-0.5'>
                                        {website.id}
                                    </code>
                                </p>
                                <pre className='overflow-x-auto rounded-md bg-muted p-4 text-xs text-muted-foreground'>
                                    <code>{trackingCode}</code>
                                </pre>
                                <Button
                                    size='sm'
                                    variant='secondary'
                                    className='absolute right-2 top-2 h-7 gap-1 px-2 text-xs'
                                    onClick={copyToClipboard}
                                >
                                    {isCopied ? (
                                        <>
                                            <Check className='h-3 w-3' />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className='h-3 w-3' />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Integration Guide */}
                    <Card className='md:col-span-2'>
                        <CardHeader>
                            <CardTitle>Integration Guide</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <p className='text-sm text-muted-foreground'>
                                Choose your framework and paste the snippet into
                                your project. The script loads asynchronously
                                and won't affect page performance.
                            </p>

                            {/* Framework Tabs */}
                            <div className='flex gap-2 border-b pb-px'>
                                {(['html', 'react', 'nextjs'] as const).map(
                                    (tab) => (
                                        <button
                                            key={tab}
                                            onClick={() =>
                                                setIntegrationTab(tab)
                                            }
                                            className={cn(
                                                'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
                                                integrationTab === tab
                                                    ? 'bg-muted text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {tab === 'html'
                                                ? 'HTML'
                                                : tab === 'react'
                                                  ? 'React'
                                                  : 'Next.js'}
                                        </button>
                                    ),
                                )}
                            </div>

                            <pre className='overflow-x-auto rounded-md bg-muted p-4 text-xs text-muted-foreground whitespace-pre'>
                                <code>
                                    {integrationTab === 'html'
                                        ? `<!-- Add to <head> -->\n<script\n  defer\n  data-website-id="${website.id}"\n  data-host-url="${trackingHost}"\n  src="${trackingHost}/assets/v1/lib/j"\n></script>`
                                        : integrationTab === 'react'
                                          ? `// components/Analytics.tsx
import { useEffect, useRef } from 'react';

export function Analytics() {
  const ref = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${trackingHost}/assets/v1/lib/j';
    script.setAttribute('data-website-id', '${website.id}');
    script.setAttribute('data-host-url', '${trackingHost}');
    script.defer = true;
    document.head.appendChild(script);
    ref.current = script;

    return () => {
      if (ref.current) {
        document.head.removeChild(ref.current);
        ref.current = null;
      }
    };
  }, []);

  return null;
}

// In your App.tsx / layout:
// import { Analytics } from './components/Analytics';
// <Analytics />`
                                          : `// app/layout.tsx  (App Router)
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${trackingHost}/assets/v1/lib/j"
          data-website-id="${website.id}"
          data-host-url="${trackingHost}"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`}
                                </code>
                            </pre>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className='border-destructive/50'>
                        <CardHeader>
                            <CardTitle className='text-destructive'>
                                Danger Zone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='font-medium'>Reset Data</p>
                                    <p className='text-sm text-muted-foreground'>
                                        Clear all analytics data for this
                                        website.
                                    </p>
                                </div>
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={() => setShowReset(true)}
                                >
                                    <RefreshCcw className='mr-2 h-4 w-4' />
                                    Reset
                                </Button>
                            </div>
                            <Separator />
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='font-medium border-destructive/20'>
                                        Delete Website
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                        Permanently remove this website and its
                                        data.
                                    </p>
                                </div>
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={() => {
                                        if (
                                            confirm(
                                                'Are you sure you want to delete this website? This action cannot be undone.',
                                            )
                                        ) {
                                            deleteWebsite.mutate(website.id, {
                                                onSuccess: () =>
                                                    navigate(
                                                        '/dashboard/sites',
                                                    ),
                                            });
                                        }
                                    }}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Modal */}
            {showEdit && (
                <EditSiteModal
                    site={website}
                    onClose={() => setShowEdit(false)}
                />
            )}

            {/* Share Modal */}
            {showShare && (
                <ShareSiteModal
                    site={website}
                    onClose={() => setShowShare(false)}
                />
            )}

            {/* Transfer Modal */}
            {showTransfer && (
                <TransferSiteModal
                    site={website}
                    onClose={() => setShowTransfer(false)}
                />
            )}

            {/* Reset Modal */}
            {showReset && (
                <ResetDataModal
                    site={website}
                    onClose={() => setShowReset(false)}
                />
            )}
        </div>
    );
}

// ── Edit Modal ───────────────────────────────────────────
function EditSiteModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const updateWebsite = useUpdateWebsite();
    const [name, setName] = useState(site.name || '');
    const [domain, setDomain] = useState(site.domain);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateWebsite.mutate(
            { id: site.id, name, domain },
            { onSuccess: () => onClose() },
        );
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Website</DialogTitle>
                    <DialogDescription>
                        Update name or domain for this website.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-domain'>Domain</Label>
                        <Input
                            id='edit-domain'
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-name'>Friendly Name</Label>
                        <Input
                            id='edit-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    {updateWebsite.error && (
                        <p className='text-sm text-destructive'>
                            {updateWebsite.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            disabled={updateWebsite.isPending}
                        >
                            {updateWebsite.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Share Modal ──────────────────────────────────────────
function ShareSiteModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const updateShare = useUpdateWebsiteShare();
    const [shareId, setShareId] = useState(site.share_id || '');
    const [isEnabled, setIsEnabled] = useState(!!site.share_id);
    const [shareConfig, setShareConfig] = useState<Record<string, boolean>>(
        site.share_config || {
            stats: true,
            graph: true,
            pages: true,
            sources: true,
            environment: true,
            geography: true,
        },
    );

    const handleConfigChange = (key: string, checked: boolean) => {
        setShareConfig((prev) => ({ ...prev, [key]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateShare.mutate(
            {
                id: site.id,
                share_id: isEnabled
                    ? shareId || crypto.randomUUID().split('-')[0]
                    : null,
                share_config: shareConfig,
            },
            { onSuccess: () => onClose() },
        );
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Public Share</DialogTitle>
                    <DialogDescription>
                        Generate a unique link to share this website's analytics
                        publicly.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='flex items-center space-x-2'>
                        <input
                            type='checkbox'
                            id='enable-share-detail'
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        <Label htmlFor='enable-share-detail'>
                            Enable public viewing link
                        </Label>
                    </div>
                    {isEnabled && (
                        <div className='space-y-4 pl-6'>
                            <div className='space-y-2'>
                                <Label htmlFor='share-id-detail'>
                                    Custom Share ID (Optional)
                                </Label>
                                <Input
                                    id='share-id-detail'
                                    value={shareId}
                                    onChange={(e) => setShareId(e.target.value)}
                                    placeholder='e.g., my-public-stats'
                                />
                                <p className='text-xs text-muted-foreground'>
                                    Your public link will be:{' '}
                                    {window.location.origin}/share/
                                    {shareId || '...'}
                                </p>
                            </div>

                            <div className='space-y-3 pt-2 border-t'>
                                <Label className='text-sm font-semibold'>
                                    What to share
                                </Label>

                                {[
                                    {
                                        id: 'stats',
                                        label: 'Overview Stats (Visitors, Pageviews)',
                                    },
                                    { id: 'graph', label: 'Activity Graph' },
                                    { id: 'pages', label: 'Pages' },
                                    {
                                        id: 'sources',
                                        label: 'Sources (Referrers)',
                                    },
                                    {
                                        id: 'environment',
                                        label: 'Environment (OS, Devices)',
                                    },
                                    {
                                        id: 'geography',
                                        label: 'Geography (Countries)',
                                    },
                                ].map(({ id, label }) => (
                                    <div
                                        key={id}
                                        className='flex items-center space-x-2'
                                    >
                                        <input
                                            type='checkbox'
                                            id={`config-${id}`}
                                            checked={shareConfig[id] ?? true}
                                            onChange={(e) =>
                                                handleConfigChange(
                                                    id,
                                                    e.target.checked,
                                                )
                                            }
                                            className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                                        />
                                        <Label
                                            htmlFor={`config-${id}`}
                                            className='font-normal cursor-pointer'
                                        >
                                            {label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {updateShare.error && (
                        <p className='text-sm text-destructive'>
                            {updateShare.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type='submit' disabled={updateShare.isPending}>
                            {updateShare.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Transfer Modal ───────────────────────────────────────
function TransferSiteModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const { data: teams } = useTeams();
    const transferWebsite = useTransferWebsite();
    const [targetTeamId, setTargetTeamId] = useState<string>('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetTeamId) return;

        transferWebsite.mutate(
            { id: site.id, team_id: targetTeamId },
            {
                onSuccess: () => {
                    onClose();
                    navigate('/dashboard/sites');
                },
            },
        );
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer Website</DialogTitle>
                    <DialogDescription>
                        Move this website to another team you belong to. You
                        will lose access if you are not a member of the target
                        team.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='target-team'>Target Team</Label>
                        <Select
                            value={targetTeamId}
                            onValueChange={setTargetTeamId}
                        >
                            <SelectTrigger id='target-team'>
                                <SelectValue placeholder='Select a team' />
                            </SelectTrigger>
                            <SelectContent>
                                {teams
                                    ?.filter((t) => t.id !== site.team_id)
                                    .map((team) => (
                                        <SelectItem
                                            key={team.id}
                                            value={team.id}
                                        >
                                            {team.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {transferWebsite.error && (
                        <p className='text-sm text-destructive'>
                            {transferWebsite.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            disabled={
                                !targetTeamId || transferWebsite.isPending
                            }
                        >
                            {transferWebsite.isPending
                                ? 'Transferring...'
                                : 'Transfer Website'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Reset Data Modal ─────────────────────────────────────
function ResetDataModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const resetData = useResetWebsiteData();
    const [confirmText, setConfirmText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (confirmText !== site.domain) return;

        resetData.mutate(site.id, {
            onSuccess: () => onClose(),
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reset Analytics Data</DialogTitle>
                    <DialogDescription>
                        This will permanently delete all analytics data for{' '}
                        <strong>{site.domain}</strong>. This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='confirm-reset'>
                            Type <strong>{site.domain}</strong> to confirm
                        </Label>
                        <Input
                            id='confirm-reset'
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={site.domain}
                            required
                        />
                    </div>
                    {resetData.error && (
                        <p className='text-sm text-destructive'>
                            {resetData.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            variant='destructive'
                            disabled={
                                confirmText !== site.domain ||
                                resetData.isPending
                            }
                        >
                            {resetData.isPending
                                ? 'Resetting...'
                                : 'Reset All Data'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
