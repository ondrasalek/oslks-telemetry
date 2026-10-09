import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountryStats, usePublicCountryStats } from '@/hooks/use-analytics';
import type { CountryStat, DateRange } from '@/types/api';

// The map pulls in d3-geo and the country shapes; only load them when shown.
const WorldMap = lazy(() => import('./world-map'));

function CountryMapView({
    data,
    isLoading,
}: {
    data: CountryStat[] | undefined;
    isLoading: boolean;
}) {
    return (
        <Card>
            <CardHeader className='pb-2'>
                <CardTitle className='text-base font-semibold'>
                    Visitors by country
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className='aspect-[2/1] w-full' />
                ) : (
                    <Suspense
                        fallback={<Skeleton className='aspect-[2/1] w-full' />}
                    >
                        <WorldMap
                            data={(data ?? []).map((c) => ({
                                value: c.value,
                                visitors: c.visitors,
                            }))}
                        />
                    </Suspense>
                )}
            </CardContent>
        </Card>
    );
}

export function CountryMapCard({
    websiteId,
    range,
}: {
    websiteId: string;
    range: DateRange;
}) {
    const { data, isLoading } = useCountryStats(websiteId, range);
    return <CountryMapView data={data} isLoading={isLoading} />;
}

export function PublicCountryMapCard({
    shareId,
    range,
}: {
    shareId: string;
    range: DateRange;
}) {
    const { data, isLoading } = usePublicCountryStats(shareId, range);
    return <CountryMapView data={data} isLoading={isLoading} />;
}
