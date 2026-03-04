import { subDays, subMonths, subHours } from 'date-fns';

export type DateFilterOption = '24h' | '7d' | '30d' | '12m' | 'all';

export interface DateRangeResult {
    from: string;
    to: string;
}

export function getDateRangeFromFilter(filter: string): DateRangeResult {
    const now = new Date();
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
