import { countryName } from '@/lib/countries';
import type { CityStat } from '@/types/api';
import type { GlobePoint } from './globe';

/** City rows from the API as dots for the globe, labelled "City, Country". */
export function cityPoints(cities: CityStat[]): GlobePoint[] {
    return cities.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        visitors: c.visitors,
        label: [c.city, c.country && countryName(c.country)]
            .filter(Boolean)
            .join(', '),
    }));
}
