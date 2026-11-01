import { lazy, Suspense, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useCityStats,
    useCountryStats,
    type AnalyticsScope,
} from '@/hooks/use-analytics';
import { countryFlag, countryName } from '@/lib/countries';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/api';
import { BreakdownTable, type BreakdownRow } from './breakdown-table';
import type { GlobePoint } from './globe';
import { Panel, SectionCard } from './section-card';

// The map and the globe pull in d3-geo and the country shapes; only load what is shown.
const WorldMap = lazy(() => import('./world-map'));
const Globe = lazy(() => import('./globe'));

const MODES = ['countries', 'cities'] as const;
const VIEWS = ['map', 'globe'] as const;
type Mode = (typeof MODES)[number];
type View = (typeof VIEWS)[number];

const VIEW_KEY = 'locations-view';

/** The last view the viewer picked; a per-viewer convenience, so storage may be unavailable. */
function readView(): View {
    try {
        return localStorage.getItem(VIEW_KEY) === 'globe' ? 'globe' : 'map';
    } catch {
        return 'map';
    }
}

function Toggle<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: readonly T[];
    onChange: (next: T) => void;
}) {
    return (
        <div className='inline-flex rounded-md border bg-background p-0.5 text-xs'>
            {options.map((option) => (
                <button
                    key={option}
                    type='button'
                    aria-pressed={value === option}
                    onClick={() => onChange(option)}
                    className={cn(
                        'rounded px-2.5 py-1 font-medium capitalize transition-colors',
                        value === option
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}

/** Where visitors are: the world map or a globe next to a ranked list of countries or cities. */
export function LocationsCard({
    scope,
    range,
}: {
    scope: AnalyticsScope;
    range: DateRange;
}) {
    const [mode, setMode] = useState<Mode>('countries');
    const [view, setView] = useState<View>(readView);
    const countries = useCountryStats(scope, range);
    const cities = useCityStats(scope, range);

    const chooseView = (next: View) => {
        setView(next);
        try {
            localStorage.setItem(VIEW_KEY, next);
        } catch {
            // Storage unavailable: the choice just lasts for this visit.
        }
    };

    const rows = useMemo<BreakdownRow[] | undefined>(() => {
        if (mode === 'countries') {
            return countries.data?.map((c) => ({
                key: c.value,
                label: (
                    <>
                        <span className='mr-2'>{countryFlag(c.value)}</span>
                        {countryName(c.value)}
                    </>
                ),
                title: countryName(c.value),
                primary: c.visitors,
                secondary: c.views,
            }));
        }
        return cities.data?.map((c) => {
            const place = c.city || 'Unknown city';
            const country = c.country ? countryName(c.country) : null;
            return {
                key: `${c.lat},${c.lng},${c.city ?? ''}`,
                label: (
                    <>
                        <span className='mr-2'>
                            {c.country ? countryFlag(c.country) : ''}
                        </span>
                        {place}
                        {country && (
                            <span className='text-muted-foreground'>
                                , {country}
                            </span>
                        )}
                    </>
                ),
                title: [place, country].filter(Boolean).join(', '),
                primary: c.visitors,
            };
        });
    }, [mode, countries.data, cities.data]);

    // Memoised: the globe rebuilds its scene whenever these change identity.
    const countryData = useMemo(
        () =>
            (countries.data ?? []).map((c) => ({
                value: c.value,
                visitors: c.visitors,
            })),
        [countries.data],
    );
    const points = useMemo<GlobePoint[]>(
        () =>
            (cities.data ?? []).map((c) => ({
                lat: c.lat,
                lng: c.lng,
                visitors: c.visitors,
                label: [c.city, c.country && countryName(c.country)]
                    .filter(Boolean)
                    .join(', '),
            })),
        [cities.data],
    );

    const active = mode === 'countries' ? countries : cities;
    const placeholder =
        view === 'globe' ? 'h-80 w-full' : 'aspect-[2/1] w-full';

    return (
        <SectionCard
            title='Locations'
            stale={active.isPlaceholderData}
            actions={
                <div className='flex flex-wrap items-center justify-end gap-2'>
                    <Toggle value={view} options={VIEWS} onChange={chooseView} />
                    <Toggle value={mode} options={MODES} onChange={setMode} />
                </div>
            }
        >
            <div className='grid items-start gap-4 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'>
                <Panel className='p-3'>
                    {countries.isLoading ? (
                        <Skeleton className={placeholder} />
                    ) : (
                        <Suspense fallback={<Skeleton className={placeholder} />}>
                            {view === 'globe' ? (
                                <Globe
                                    data={countryData}
                                    points={points}
                                    className='h-80 w-full'
                                />
                            ) : (
                                <WorldMap
                                    data={countryData}
                                    cities={cities.data ?? []}
                                />
                            )}
                        </Suspense>
                    )}
                </Panel>
                <BreakdownTable
                    rows={rows}
                    isLoading={active.isLoading}
                    nameLabel={mode === 'countries' ? 'Country' : 'City'}
                    primaryLabel='Visitors'
                    secondaryLabel={mode === 'countries' ? 'Views' : undefined}
                    pageSize={8}
                    emptyHint={`No ${mode} data for the selected range.`}
                />
            </div>
            <p className='mt-3 text-xs text-muted-foreground'>
                This product includes GeoLite2 data created by MaxMind,
                available from{' '}
                <a
                    href='https://www.maxmind.com'
                    target='_blank'
                    rel='noreferrer'
                    className='underline underline-offset-2 hover:text-foreground'
                >
                    maxmind.com
                </a>
                .
            </p>
        </SectionCard>
    );
}
