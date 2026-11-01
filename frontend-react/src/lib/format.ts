const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
});

/** 950 -> "950", 1730 -> "1.73K". */
export function formatCompact(n: number): string {
    return Math.abs(n) < 1000 ? String(Math.round(n)) : compact.format(n);
}

export function formatPercent(n: number): string {
    return `${n.toFixed(1)}%`;
}

/** Seconds -> "45s", "2m 5s", "1h 3m 9s". */
export function formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

export type BucketInterval = 'hour' | 'day';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Label for a chart bucket. The chart request asks the API to cut buckets in the
 * browser's timezone, so a bucket starts at a local midnight / local hour and is
 * labelled in local time.
 *
 * `long` is the tooltip form; the short form is for axis ticks, where an hourly
 * axis shows the date at midnight and the time of day otherwise.
 */
export function formatBucket(
    timestamp: string,
    interval: BucketInterval,
    long = false,
): string {
    const d = new Date(timestamp);
    if (interval === 'day') {
        return d.toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
            ...(long && { weekday: 'long', year: 'numeric' }),
        });
    }
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const month = d.toLocaleDateString('en', { month: 'short' });
    if (long) return `${d.getDate()} ${month}, ${time}`;
    return d.getHours() === 0 ? `${d.getDate()} ${month}` : time;
}
