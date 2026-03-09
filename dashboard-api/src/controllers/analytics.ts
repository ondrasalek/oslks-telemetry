import type { Request, Response } from 'express';
import sql from '../lib/db.js';

export const getStats = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const {
        start_at,
        end_at,
        url,
        referrer,
        os,
        browser,
        device,
        country,
        event_name,
    } = req.query;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Basic permission check
        console.log(
            `[Analytics] Fetching stats for website ${website_id} (User: ${userId})`,
        );
        const websitesData = await sql`
            SELECT 1 FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            WHERE w.id = ${website_id}::uuid AND tm.user_id = ${userId}::uuid
            LIMIT 1
        `;
        if (websitesData.length === 0) {
            console.warn(
                `[Analytics] Permission denied or website not found: ${website_id} for user ${userId}`,
            );
            return res.status(404).json({ error: 'Website not found' });
        }

        const stats = await sql`
            SELECT 
                COUNT(DISTINCT session_id)::int as visitors,
                COUNT(*)::int as pageviews,
                COUNT(*)::int as visits,
                0::float as bounce_rate,
                0::float as avg_duration
            FROM events
            WHERE website_id = ${website_id}::uuid
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
              AND (${(url as string) || null}::text IS NULL OR url = ${(url as string) || null}::text)
              AND (${(referrer as string) || null}::text IS NULL OR referrer = ${(referrer as string) || null}::text)
              AND (${(os as string) || null}::text IS NULL OR os = ${(os as string) || null}::text)
              AND (${(browser as string) || null}::text IS NULL OR browser = ${(browser as string) || null}::text)
              AND (${(device as string) || null}::text IS NULL OR device_type = ${(device as string) || null}::text)
              AND (${(country as string) || null}::text IS NULL OR country = ${(country as string) || null}::text)
              AND (${(event_name as string) || null}::text IS NULL OR event_name = ${(event_name as string) || null}::text)
        `;
        console.log(`[Analytics] Stats result: ${JSON.stringify(stats[0])}`);

        res.json(stats[0]);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

export const getMetrics = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const { metric_type, limit, start_at, end_at } = req.query;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const allowedColumns = [
        'url',
        'referrer',
        'os',
        'browser',
        'device_type',
        'country',
        'event_name',
    ];
    if (!allowedColumns.includes(metric_type as string)) {
        return res.status(400).json({ error: 'Invalid metric type' });
    }

    try {
        const websitesData = await sql`
            SELECT 1 FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            WHERE w.id = ${website_id} AND tm.user_id = ${userId}
            LIMIT 1
        `;
        if (websitesData.length === 0)
            return res.status(404).json({ error: 'Website not found' });

        const col = metric_type as string;
        const metrics = await sql`
            SELECT 
                COALESCE(${sql(col)}, 'Unknown') as value,
                COUNT(*)::int as count
            FROM events
            WHERE website_id = ${website_id}
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
            GROUP BY ${sql(col)}
            ORDER BY count DESC
            LIMIT ${parseInt(limit as string) || 10}
        `;

        res.json(metrics);
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};

export const getActiveVisitors = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const websitesData = await sql`
            SELECT 1 FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            WHERE w.id = ${website_id} AND tm.user_id = ${userId}
            LIMIT 1
        `;
        if (websitesData.length === 0)
            return res.status(404).json({ error: 'Website not found' });

        const result = await sql`
            SELECT COUNT(DISTINCT session_id)::int as count 
            FROM events 
            WHERE website_id = ${website_id}
              AND created_at >= NOW() - INTERVAL '5 minutes'
        `;
        res.json(result[0]?.count || 0);
    } catch (error) {
        console.error('Active visitors error:', error);
        res.status(500).json({ error: 'Failed to fetch active visitors' });
    }
};

export const getChartData = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const { start_at, end_at, interval } = req.query;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const websitesData = await sql`
            SELECT 1 FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            WHERE w.id = ${website_id} AND tm.user_id = ${userId}
            LIMIT 1
        `;
        if (websitesData.length === 0)
            return res.status(404).json({ error: 'Website not found' });

        const intervalSql =
            interval === 'minute'
                ? 'minute'
                : interval === 'hour'
                  ? 'hour'
                  : interval === 'month'
                    ? 'month'
                    : 'day';

        const chart_data = await sql`
            SELECT 
                date_trunc(${intervalSql}, created_at) as timestamp,
                COUNT(DISTINCT session_id)::int as visitors,
                COUNT(*)::int as views
            FROM events
            WHERE website_id = ${website_id}
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
            GROUP BY timestamp
            ORDER BY timestamp ASC
        `;

        res.json(chart_data);
    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
};
