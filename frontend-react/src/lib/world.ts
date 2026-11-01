import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldUrl from 'world-atlas/countries-110m.json?url';

export type CountryFeature = Feature<Geometry, { name: string }>;

/** Numeric ISO id of Antarctica; the flat map leaves it out, the globe keeps it. */
export const ANTARCTICA = '010';

// The topology is static, so share one fetch across every map and globe instance.
let worldPromise: Promise<CountryFeature[]> | null = null;

/** Every country of the 110m world atlas as GeoJSON features (`id` = numeric ISO code). */
export const loadWorld = (): Promise<CountryFeature[]> =>
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
            return collection.features;
        })
        .catch((error) => {
            worldPromise = null; // allow a retry on the next mount
            throw error;
        }));
