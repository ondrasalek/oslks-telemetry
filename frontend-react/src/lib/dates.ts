import {
    addDays,
    addHours,
    startOfDay,
    startOfHour,
    subDays,
    subMonths,
    subHours,
} from 'date-fns';
import type { ChartDataPoint, DateRange } from '@/types/api';
import type { BucketInterval } from '@/lib/format';

export type DateFilterOption = '24h' | '7d' | '30d' | '12m' | 'all';

/** The viewer's IANA timezone; chart buckets are cut in it so days match their calendar. */
export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** More than this many buckets and a gap-filled chart stops being readable (or cheap). */
const MAX_BUCKETS = 800;

const ZERO = {
    views: 0,
    visitors: 0,
    bounce_rate: 0,
    avg_duration: 0,
} satisfies Omit<ChartDataPoint, 'timestamp'>;

/**
 * The API only returns buckets that saw traffic, so a quiet day would be skipped
 * and the line drawn straight across it. This inserts zero buckets across the
 * range. With `clampToData` (an open-ended range like "all time") the series
 * starts at the first bucket that has data instead of at the range start.
 *
 * Buckets are walked in the browser's timezone (calendar days, so a 23h or 25h
 * day across a DST change is still one bucket), which is the zone the chart
 * request asks the API to cut them in. If the API's buckets still do not line up,
 * the data is returned untouched rather than misplotted.
 */
export function fillGaps(
    data: ChartDataPoint[],
    interval: BucketInterval,
    range: DateRange,
    clampToData = false,
): ChartDataPoint[] {
    if (clampToData && !data.length) return data;

    const floor = interval === 'hour' ? startOfHour : startOfDay;
    const next = interval === 'hour' ? addHours : addDays;
    const stepMs = interval === 'hour' ? 3_600_000 : 86_400_000;

    const byTime = new Map(data.map((p) => [Date.parse(p.timestamp), p]));
    const first = data.length ? Date.parse(data[0].timestamp) : Infinity;
    const last = data.length ? Date.parse(data[data.length - 1].timestamp) : -Infinity;

    const start = clampToData
        ? first
        : Math.min(floor(new Date(range.from)).getTime(), first);
    const end = Math.max(floor(new Date(range.to)).getTime(), last);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return data;
    if ((end - start) / stepMs > MAX_BUCKETS) return data;

    const out: ChartDataPoint[] = [];
    let matched = 0;
    for (let t = new Date(start); t.getTime() <= end; t = next(t, 1)) {
        const point = byTime.get(t.getTime());
        if (point) matched++;
        out.push(point ?? { timestamp: t.toISOString(), ...ZERO });
    }
    return matched === data.length ? out : data;
}

export interface DateRangeResult {
    from: string;
    to: string;
}

export function getDateRangeFromFilter(
    filter: string,
    now: Date = new Date(),
): DateRangeResult {
    const to = now.toISOString();

    switch (filter) {
        case '24h':
            return {
                from: subHours(now, 24).toISOString(),
                to,
            };
        case '7d':
            return {
                from: subDays(now, 7).toISOString(),
                to,
            };
        case '30d':
            return {
                from: subDays(now, 30).toISOString(),
                to,
            };
        case '12m':
            return {
                from: subMonths(now, 12).toISOString(),
                to,
            };
        case 'all':
            return {
                from: new Date(0).toISOString(), // Beginning of epoch
                to,
            };
        default:
            // Default 30 days
            return {
                from: subDays(now, 30).toISOString(),
                to,
            };
    }
}
