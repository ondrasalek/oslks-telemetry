import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { usePublicWebsite } from '@/hooks/use-websites';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrafficAnalytics,
    type TrafficFeatures,
} from '@/components/analytics/traffic-analytics';
import { PublicRealtimePanel } from '@/components/analytics/realtime-panel';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

export function PublicSharePage() {
    const { share_id } = useParams<{ share_id: string }>();
    const {
        data: website,
        isLoading,
        error,
    } = usePublicWebsite(share_id ?? '');

    const [tab, setTab] = useState<'overview' | 'realtime'>('overview');

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

    const features: TrafficFeatures = {
        stats: isFeatureEnabled('stats'),
        graph: isFeatureEnabled('graph'),
        pages: isFeatureEnabled('pages'),
        sources: isFeatureEnabled('sources'),
        environment: isFeatureEnabled('environment'),
        geography: isFeatureEnabled('geography'),
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
                </div>
            </div>

            <div className='max-w-6xl mx-auto p-6 space-y-6'>
                {features.stats && (
                    <div className='flex gap-4 border-b'>
                        {(['overview', 'realtime'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'pb-2 -mb-px border-b-2 font-medium capitalize transition-colors hover:text-primary',
                                    tab === t
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground border-transparent',
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}

                {tab === 'realtime' && features.stats ? (
                    <PublicRealtimePanel
                        shareId={share_id!}
                        showPages={features.pages}
                        showCountries={features.geography}
                    />
                ) : (
                    <TrafficAnalytics
                        scope={{ id: share_id!, shared: true }}
                        features={features}
                    />
                )}
            </div>
        </div>
    );
}
