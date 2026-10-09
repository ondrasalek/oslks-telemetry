import type { Request, Response } from 'express';
import sql from '../lib/db.js';
import { isSuperuserSession } from '../lib/access.js';

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
        const superuser = await isSuperuserSession(req, userId);
        const websitesData = await sql`
            SELECT 1 FROM websites w
            WHERE w.id = ${website_id}::uuid AND (${superuser}::boolean OR EXISTS (
                SELECT 1 FROM team_members tm WHERE tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
            ))
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
                COALESCE(SUM(pageviews), 0)::int as pageviews,
                COUNT(*)::int as visits,
                COALESCE(
                    SUM(CASE WHEN pageviews = 1 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(DISTINCT session_id), 0) * 100,
                    0
                )::float as bounce_rate,
                COALESCE(
                    AVG(EXTRACT(EPOCH FROM duration)),
                    0
                )::float as avg_duration
            FROM (
                SELECT 
                    session_id,
                    COUNT(*) as pageviews,
                    MAX(created_at) - MIN(created_at) as duration
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
                GROUP BY session_id
            ) as session_stats
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
        const superuser = await isSuperuserSession(req, userId);
        const websitesData = await sql`
            SELECT 1 FROM websites w
            WHERE w.id = ${website_id}::uuid AND (${superuser}::boolean OR EXISTS (
                SELECT 1 FROM team_members tm WHERE tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
            ))
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
        const superuser = await isSuperuserSession(req, userId);
        const websitesData = await sql`
            SELECT 1 FROM websites w
            WHERE w.id = ${website_id}::uuid AND (${superuser}::boolean OR EXISTS (
                SELECT 1 FROM team_members tm WHERE tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
            ))
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

/** Resolves a website the caller may read, or sends the error response and returns null. */
const requireWebsiteAccess = async (
    req: Request,
    res: Response,
    websiteId: string,
): Promise<boolean> => {
    const userId = (req.session as any).userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId)) {
        res.status(404).json({ error: 'Website not found' });
        return false;
    }
    const superuser = await isSuperuserSession(req, userId);
    const rows = await sql`
        SELECT 1 FROM websites w
        WHERE w.id = ${websiteId}::uuid AND (${superuser}::boolean OR EXISTS (
            SELECT 1 FROM team_members tm WHERE tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
        ))
        LIMIT 1
    `;
    if (rows.length === 0) {
        res.status(404).json({ error: 'Website not found' });
        return false;
    }
    return true;
};

/** Distinct visitors per country for the map (the generic /metrics counts raw events). */
export const getCountryStats = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const { start_at, end_at } = req.query;

    try {
        if (!(await requireWebsiteAccess(req, res, website_id))) return;

        const countries = await sql`
            SELECT country AS value,
                   COUNT(DISTINCT session_id)::int AS visitors,
                   COUNT(*)::int AS views
            FROM events
            WHERE website_id = ${website_id}::uuid
              AND country IS NOT NULL
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
            GROUP BY country
            ORDER BY visitors DESC
        `;
        res.json(countries);
    } catch (error) {
        console.error('Country stats error:', error);
        res.status(500).json({ error: 'Failed to fetch country stats' });
    }
};

const REALTIME_MINUTES = 30;

/** Last-30-minutes snapshot: totals, a per-minute series, top pages and countries. */
export const getRealtime = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };

    try {
        if (!(await requireWebsiteAccess(req, res, website_id))) return;

        const [totals] = await sql`
            SELECT COUNT(DISTINCT session_id)::int AS visitors,
                   COUNT(*)::int AS views,
                   COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '5 minutes')::int AS active
            FROM events
            WHERE website_id = ${website_id}::uuid
              AND created_at >= NOW() - make_interval(mins => ${REALTIME_MINUTES})
        `;

        // generate_series gives every minute a bucket, so quiet minutes show as zero.
        const per_minute = await sql`
            SELECT m.minute AS timestamp,
                   COALESCE(COUNT(DISTINCT e.session_id), 0)::int AS visitors,
                   COUNT(e.session_id)::int AS views
            FROM generate_series(
                date_trunc('minute', NOW()) - make_interval(mins => ${REALTIME_MINUTES - 1}),
                date_trunc('minute', NOW()),
                INTERVAL '1 minute'
            ) AS m(minute)
            LEFT JOIN events e
              ON e.website_id = ${website_id}::uuid
             AND e.created_at >= m.minute
             AND e.created_at < m.minute + INTERVAL '1 minute'
            GROUP BY m.minute
            ORDER BY m.minute ASC
        `;

        const top = (column: 'url' | 'country', limit: number) => sql`
            SELECT ${sql(column)} AS value, COUNT(DISTINCT session_id)::int AS visitors
            FROM events
            WHERE website_id = ${website_id}::uuid
              AND created_at >= NOW() - make_interval(mins => ${REALTIME_MINUTES})
              AND ${sql(column)} IS NOT NULL
            GROUP BY ${sql(column)}
            ORDER BY visitors DESC
            LIMIT ${limit}
        `;
        // Countries are unbounded (the map shades all of them); the UI trims its list.
        const [pages, countries] = await Promise.all([top('url', 8), top('country', 300)]);

        res.json({
            window_minutes: REALTIME_MINUTES,
            visitors: totals?.visitors ?? 0,
            views: totals?.views ?? 0,
            active: totals?.active ?? 0,
            per_minute,
            pages,
            countries,
        });
    } catch (error) {
        console.error('Realtime error:', error);
        res.status(500).json({ error: 'Failed to fetch realtime data' });
    }
};

export const getChartData = async (req: Request, res: Response) => {
    const { website_id } = req.params as { website_id: string };
    const { start_at, end_at, interval } = req.query;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const superuser = await isSuperuserSession(req, userId);
        const websitesData = await sql`
            SELECT 1 FROM websites w
            WHERE w.id = ${website_id}::uuid AND (${superuser}::boolean OR EXISTS (
                SELECT 1 FROM team_members tm WHERE tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
            ))
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

export const getTeamStats = async (req: Request, res: Response) => {
    const { team_id } = req.params as { team_id: string };
    const { start_at, end_at } = req.query;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Permission check: Is user a member of the team?
        const members = (await isSuperuserSession(req, userId))
            ? [1]
            : await sql`
                SELECT 1 FROM team_members
                WHERE team_id = ${team_id}::uuid AND user_id = ${userId}::uuid
                LIMIT 1
            `;
        if (members.length === 0)
            return res.status(403).json({ error: 'Forbidden' });

        const stats = await sql`
            SELECT 
                COUNT(DISTINCT session_id)::int as visitors,
                COALESCE(SUM(pageviews), 0)::int as pageviews,
                COUNT(*)::int as visits,
                COALESCE(
                    SUM(CASE WHEN pageviews = 1 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(DISTINCT session_id), 0) * 100,
                    0
                )::float as bounce_rate,
                COALESCE(
                    AVG(EXTRACT(EPOCH FROM duration)),
                    0
                )::float as avg_duration
            FROM (
                SELECT 
                    e.session_id,
                    COUNT(*) as pageviews,
                    MAX(e.created_at) - MIN(e.created_at) as duration
                FROM events e
                JOIN websites w ON e.website_id = w.id
                WHERE w.team_id = ${team_id}::uuid
                  AND (${(start_at as string) || null}::timestamptz IS NULL OR e.created_at >= ${(start_at as string) || null}::timestamptz)
                  AND (${(end_at as string) || null}::timestamptz IS NULL OR e.created_at <= ${(end_at as string) || null}::timestamptz)
                GROUP BY e.session_id
            ) as session_stats
        `;

        res.json(stats[0]);
    } catch (error) {
        console.error('Team stats error:', error);
        res.status(500).json({ error: 'Failed to fetch team stats' });
    }
};

// ── Shared Analytics Handlers ─────────────────────────────────────────────

async function getSharedWebsiteInfo(share_id: string) {
    const websites = await sql`
        SELECT id, share_config FROM websites WHERE share_id = ${share_id} LIMIT 1
    `;
    return websites[0];
}

function isSharedFeatureEnabled(config: any, feature: string) {
    if (!config || Object.keys(config).length === 0) return true;
    return !!config[feature];
}

export const getSharedStats = async (req: Request, res: Response) => {
    const { share_id } = req.params as { share_id: string };
    const { start_at, end_at } = req.query;

    try {
        const website = await getSharedWebsiteInfo(share_id);
        if (!website)
            return res.status(404).json({ error: 'Website not found' });

        if (!isSharedFeatureEnabled(website.share_config, 'stats')) {
            return res.status(403).json({ error: 'Feature disabled' });
        }

        const stats = await sql`
            SELECT 
                COUNT(DISTINCT session_id)::int as visitors,
                COALESCE(SUM(pageviews), 0)::int as pageviews,
                COUNT(*)::int as visits,
                COALESCE(
                    SUM(CASE WHEN pageviews = 1 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(DISTINCT session_id), 0) * 100,
                    0
                )::float as bounce_rate,
                COALESCE(
                    AVG(EXTRACT(EPOCH FROM duration)),
                    0
                )::float as avg_duration
            FROM (
                SELECT 
                    session_id,
                    COUNT(*) as pageviews,
                    MAX(created_at) - MIN(created_at) as duration
                FROM events
                WHERE website_id = ${website.id}::uuid
                  AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
                  AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
                GROUP BY session_id
            ) as session_stats
        `;

        res.json(stats[0]);
    } catch (error) {
        console.error('Shared stats error:', error);
        res.status(500).json({ error: 'Failed to fetch shared stats' });
    }
};

export const getSharedMetrics = async (req: Request, res: Response) => {
    const { share_id } = req.params as { share_id: string };
    const { metric_type, limit, start_at, end_at } = req.query;

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
        const website = await getSharedWebsiteInfo(share_id);
        if (!website)
            return res.status(404).json({ error: 'Website not found' });

        const feature =
            metric_type === 'url'
                ? 'pages'
                : metric_type === 'referrer'
                  ? 'sources'
                  : ['os', 'browser', 'device_type'].includes(
                          metric_type as string,
                      )
                    ? 'environment'
                    : metric_type === 'country'
                      ? 'geography'
                      : 'stats';

        if (!isSharedFeatureEnabled(website.share_config, feature)) {
            return res.status(403).json({ error: 'Feature disabled' });
        }

        const col = metric_type as string;
        const metrics = await sql`
            SELECT 
                COALESCE(${sql(col)}, 'Unknown') as value,
                COUNT(*)::int as count
            FROM events
            WHERE website_id = ${website.id}::uuid
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
            GROUP BY ${sql(col)}
            ORDER BY count DESC
            LIMIT ${parseInt(limit as string) || 10}
        `;

        res.json(metrics);
    } catch (error) {
        console.error('Shared metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch shared metrics' });
    }
};

export const getSharedChartData = async (req: Request, res: Response) => {
    const { share_id } = req.params as { share_id: string };
    const { start_at, end_at, interval } = req.query;

    try {
        const website = await getSharedWebsiteInfo(share_id);
        if (!website)
            return res.status(404).json({ error: 'Website not found' });

        if (!isSharedFeatureEnabled(website.share_config, 'graph')) {
            return res.status(403).json({ error: 'Feature disabled' });
        }

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
            WHERE website_id = ${website.id}::uuid
              AND (${(start_at as string) || null}::timestamptz IS NULL OR created_at >= ${(start_at as string) || null}::timestamptz)
              AND (${(end_at as string) || null}::timestamptz IS NULL OR created_at <= ${(end_at as string) || null}::timestamptz)
            GROUP BY timestamp
            ORDER BY timestamp ASC
        `;

        res.json(chart_data);
    } catch (error) {
        console.error('Shared chart data error:', error);
        res.status(500).json({ error: 'Failed to fetch shared chart data' });
    }
};

export const getSharedActiveVisitors = async (req: Request, res: Response) => {
    const { share_id } = req.params as { share_id: string };

    try {
        const website = await getSharedWebsiteInfo(share_id);
        if (!website)
            return res.status(404).json({ error: 'Website not found' });

        if (!isSharedFeatureEnabled(website.share_config, 'stats')) {
            return res.status(403).json({ error: 'Feature disabled' });
        }

        const result = await sql`
            SELECT COUNT(DISTINCT session_id)::int as count 
            FROM events 
            WHERE website_id = ${website.id}::uuid
              AND created_at >= NOW() - INTERVAL '5 minutes'
        `;
        res.json(result[0]?.count || 0);
    } catch (error) {
        console.error('Shared active visitors error:', error);
        res.status(500).json({
            error: 'Failed to fetch shared active visitors',
        });
    }
};
