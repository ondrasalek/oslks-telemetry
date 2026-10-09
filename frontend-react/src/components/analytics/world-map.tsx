import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { alpha2ToNumeric } from 'i18n-iso-countries';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldUrl from 'world-atlas/countries-110m.json?url';

interface WorldMapProps {
    /** ISO alpha-2 country code -> visitors. */
    data: { value: string; visitors: number }[];
}

type CountryFeature = Feature<Geometry, { name: string }>;

const WIDTH = 960;
const HEIGHT = 480;
const ANTARCTICA = '010';

// The topology is static, so share one fetch across every map instance.
let worldPromise: Promise<CountryFeature[]> | null = null;
const loadWorld = (): Promise<CountryFeature[]> =>
    (worldPromise ??= fetch(worldUrl)
        .then((r) => r.json() as Promise<Topology>)
        .then((topology) => {
            const countries = topology.objects.countries as GeometryCollection<{
                name: string;
            }>;
            const collection = feature(
                topology,
                countries,
            ) as FeatureCollection<Geometry, { name: string }>;
            return collection.features.filter((f) => f.id !== ANTARCTICA);
        })
        .catch((error) => {
            worldPromise = null; // allow a retry on the next mount
            throw error;
        }));

const projection = geoNaturalEarth1().fitExtent(
    [
        [4, 4],
        [WIDTH - 4, HEIGHT - 4],
    ],
    { type: 'Sphere' },
);
const pathFor = geoPath(projection);

export default function WorldMap({ data }: WorldMapProps) {
    const [features, setFeatures] = useState<CountryFeature[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [hovered, setHovered] = useState<{
        name: string;
        visitors: number;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadWorld()
            .then((f) => !cancelled && setFeatures(f))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, []);

    // Numeric id (what the map uses) -> visitors.
    const { byId, max } = useMemo(() => {
        const byId = new Map<string, number>();
        for (const row of data) {
            const id = alpha2ToNumeric(row.value.toUpperCase());
            if (id) byId.set(id, (byId.get(id) ?? 0) + row.visitors);
        }
        return { byId, max: Math.max(0, ...byId.values()) };
    }, [data]);

    const fillFor = (visitors: number) => {
        if (!visitors || max === 0) return 'var(--muted)';
        // sqrt keeps a single huge country from washing out the rest.
        const strength = 25 + 75 * Math.sqrt(visitors / max);
        return `color-mix(in oklab, var(--primary) ${strength.toFixed(0)}%, var(--muted))`;
    };

    if (failed) {
        return (
            <p className='py-8 text-center text-sm text-muted-foreground'>
                The map could not be loaded.
            </p>
        );
    }

    return (
        <div className='space-y-2'>
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className='h-auto w-full'
                role='img'
                aria-label='Visitors by country'
            >
                {features?.map((f) => {
                    const id = String(f.id);
                    const visitors = byId.get(id) ?? 0;
                    return (
                        <path
                            key={id}
                            d={pathFor(f) ?? undefined}
                            style={{ fill: fillFor(visitors) }}
                            className='stroke-background transition-colors hover:opacity-80'
                            strokeWidth={0.5}
                            onMouseEnter={() =>
                                setHovered({
                                    name: f.properties.name,
                                    visitors,
                                })
                            }
                            onMouseLeave={() => setHovered(null)}
                        >
                            <title>
                                {f.properties.name}: {visitors}{' '}
                                {visitors === 1 ? 'visitor' : 'visitors'}
                            </title>
                        </path>
                    );
                })}
            </svg>
            <div className='flex h-5 items-center justify-between text-xs text-muted-foreground'>
                <span>
                    {hovered
                        ? `${hovered.name}: ${hovered.visitors} ${hovered.visitors === 1 ? 'visitor' : 'visitors'}`
                        : features
                          ? 'Hover a country for details'
                          : 'Loading map…'}
                </span>
                <span className='flex items-center gap-2'>
                    Fewer
                    <span
                        className='h-2 w-24 rounded-full'
                        style={{
                            background:
                                'linear-gradient(to right, color-mix(in oklab, var(--primary) 25%, var(--muted)), var(--primary))',
                        }}
                    />
                    More
                </span>
            </div>
        </div>
    );
}
