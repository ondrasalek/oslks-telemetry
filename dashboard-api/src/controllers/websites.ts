import type { Request, Response } from 'express';
import sql from '../lib/db.js';

export const listWebsites = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // A team-scoped API key only ever sees that team's websites.
    const apiKeyTeamId = req.apiKey?.teamId ?? null;

    try {
        console.log(`[Websites] Listing websites for user ${userId}`);
        const websites = await sql`
            SELECT w.*, t.name as team_name,
                   (SELECT MAX(e.created_at) FROM events e WHERE e.website_id = w.id) AS last_event_at
            FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            LEFT JOIN teams t ON w.team_id = t.id
            WHERE tm.user_id = ${userId}::uuid
              AND (${apiKeyTeamId}::uuid IS NULL OR w.team_id = ${apiKeyTeamId}::uuid)
            ORDER BY w.is_pinned DESC, w.created_at DESC
        `;

        console.log(
            `[Websites] Found ${websites.length} websites for user ${userId}`,
        );
        res.json(websites);
    } catch (error) {
        console.error('List websites error:', error);
        res.status(500).json({ error: 'Failed to fetch websites' });
    }
};

export const createWebsite = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { name, domain, team_id } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (typeof domain !== 'string' || !domain.trim()) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    try {
        let finalTeamId = team_id;

        // A team-scoped API key pins the target team; it may not create
        // websites for any other team, even one its owner belongs to.
        const apiKeyTeamId = req.apiKey?.teamId ?? null;
        if (apiKeyTeamId) {
            if (finalTeamId && finalTeamId !== apiKeyTeamId) {
                return res
                    .status(403)
                    .json({ error: 'API key is scoped to a different team' });
            }
            finalTeamId = apiKeyTeamId;
        }

        // If no team_id provided, use user's primary team
        if (!finalTeamId) {
            const memberships = await sql`
                SELECT team_id FROM team_members 
                WHERE user_id = ${userId}::uuid 
                LIMIT 1
            `;
            if (memberships.length > 0) {
                finalTeamId = memberships[0].team_id;
            }
        }

        // Ensure user is in the team
        if (finalTeamId) {
            const members = await sql`
                SELECT 1 FROM team_members 
                WHERE team_id = ${finalTeamId}::uuid AND user_id = ${userId}::uuid
            `;
            if (members.length === 0)
                return res.status(403).json({ error: 'Forbidden' });
        } else {
            return res.status(400).json({ error: 'Team ID is required' });
        }

        const shareId = Math.random().toString(36).substring(2, 15);

        const [website] = await sql`
            INSERT INTO websites (name, domain, team_id, share_id)
            VALUES (${name || null}, ${domain.trim()}, ${finalTeamId}::uuid, ${shareId})
            RETURNING *
        `;
        res.status(201).json(website);
    } catch (error) {
        // Domain is UNIQUE — surface the conflict instead of a generic 500 so
        // programmatic callers can react to it.
        if ((error as { code?: string })?.code === '23505') {
            return res
                .status(409)
                .json({ error: 'A website with this domain already exists' });
        }
        console.error('Create website error:', error);
        res.status(500).json({ error: 'Failed to create website' });
    }
};

export const getWebsite = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        console.log(`[Websites] Fetching website ${id} for user ${userId}`);
        const websites = await sql`
            SELECT w.*,
                   (SELECT MAX(e.created_at) FROM events e WHERE e.website_id = w.id) AS last_event_at
            FROM websites w
            JOIN team_members tm ON w.team_id = tm.team_id
            WHERE w.id = ${id as string}::uuid AND tm.user_id = ${userId}::uuid
            LIMIT 1
        `;
        const website = websites[0];

        if (!website)
            return res.status(404).json({ error: 'Website not found' });
        res.json(website);
    } catch (error) {
        console.error('Get website error:', error);
        res.status(500).json({ error: 'Failed to fetch website' });
    }
};

export const listAllWebsites = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
        if (user[0]?.role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const websites = await sql`
            SELECT w.id, w.domain, w.name, w.status, w.share_id, w.is_pinned, w.created_at, t.name as team_name, w.team_id,
                   (SELECT MAX(e.created_at) FROM events e WHERE e.website_id = w.id) AS last_event_at
            FROM websites w
            LEFT JOIN teams t ON w.team_id = t.id
            ORDER BY w.created_at DESC
        `;
        res.json(websites);
    } catch (error) {
        console.error('List all websites error:', error);
        res.status(500).json({ error: 'Failed to fetch all websites' });
    }
};

export const listTeamWebsites = async (req: Request, res: Response) => {
    const { team_id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Verify user is in the team
        const members = await sql`
            SELECT 1 FROM team_members 
            WHERE team_id = ${team_id}::uuid AND user_id = ${userId}::uuid
            LIMIT 1
        `;
        if (members.length === 0)
            return res.status(403).json({ error: 'Forbidden' });

        const websites = await sql`
            SELECT w.*,
                   (SELECT MAX(e.created_at) FROM events e WHERE e.website_id = w.id) AS last_event_at
            FROM websites w
            WHERE w.team_id = ${team_id}::uuid
            ORDER BY w.is_pinned DESC, w.created_at DESC
        `;

        res.json(websites);
    } catch (error) {
        console.error('List team websites error:', error);
        res.status(500).json({ error: 'Failed to fetch team websites' });
    }
};

/**
 * Resolve the caller's access to a website: the team role of the caller (or
 * 'superuser'), or null when the website is missing / not theirs.
 */
const getWebsiteAccess = async (websiteId: string, userId: string) => {
    const rows = await sql`
        SELECT w.id, w.team_id, tm.role AS team_role, u.role AS user_role
        FROM websites w
        JOIN users u ON u.id = ${userId}::uuid
        LEFT JOIN team_members tm
               ON tm.team_id = w.team_id AND tm.user_id = ${userId}::uuid
        WHERE w.id = ${websiteId}::uuid
        LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    const isSuper = row.user_role === 'superuser';
    if (!row.team_role && !isSuper) return null;
    return {
        teamId: row.team_id as string,
        canManage:
            isSuper || row.team_role === 'owner' || row.team_role === 'admin',
    };
};

const UUID_RE =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Shared guard for the mutating website routes. Sends the error response and
 * returns null when the caller may not proceed.
 */
const authorize = async (
    req: Request,
    res: Response,
    { manage }: { manage: boolean },
) => {
    const userId = (req.session as any).userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }
    const id = req.params.id as string;
    if (!UUID_RE.test(id)) {
        res.status(404).json({ error: 'Website not found' });
        return null;
    }
    const access = await getWebsiteAccess(id, userId);
    if (!access) {
        res.status(404).json({ error: 'Website not found' });
        return null;
    }
    if (manage && !access.canManage) {
        res.status(403).json({ error: 'Forbidden' });
        return null;
    }
    return { id, userId, ...access };
};

export const updateWebsite = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: false });
        if (!ctx) return;
        const { domain, name } = req.body ?? {};

        if (domain !== undefined && (typeof domain !== 'string' || !domain.trim())) {
            return res.status(400).json({ error: 'Domain must not be empty' });
        }

        await sql`
            UPDATE websites SET
                domain = COALESCE(${domain?.trim() ?? null}, domain),
                name = CASE WHEN ${name !== undefined} THEN ${name || null} ELSE name END,
                updated_at = NOW()
            WHERE id = ${ctx.id}::uuid
        `;
        res.json({ success: true });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res
                .status(409)
                .json({ error: 'A website with this domain already exists' });
        }
        console.error('Update website error:', error);
        res.status(500).json({ error: 'Failed to update website' });
    }
};

export const deleteWebsite = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: true });
        if (!ctx) return;
        // events and other children cascade via their website_id FK
        await sql`DELETE FROM websites WHERE id = ${ctx.id}::uuid`;
        res.json({ success: true });
    } catch (error) {
        console.error('Delete website error:', error);
        res.status(500).json({ error: 'Failed to delete website' });
    }
};

export const resetWebsiteData = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: true });
        if (!ctx) return;
        await sql`DELETE FROM events WHERE website_id = ${ctx.id}::uuid`;
        res.json({ success: true });
    } catch (error) {
        console.error('Reset website data error:', error);
        res.status(500).json({ error: 'Failed to reset website data' });
    }
};

export const togglePinWebsite = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: false });
        if (!ctx) return;
        await sql`
            UPDATE websites SET is_pinned = NOT is_pinned
            WHERE id = ${ctx.id}::uuid
        `;
        res.json({ success: true });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
};

export const updateWebsiteShare = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: false });
        if (!ctx) return;
        const { share_id, share_config } = req.body ?? {};

        if (share_id !== null && share_id !== undefined && typeof share_id !== 'string') {
            return res.status(400).json({ error: 'Invalid share_id' });
        }

        await sql`
            UPDATE websites SET
                share_id = ${share_id || null},
                share_config = COALESCE(${share_config ? JSON.stringify(share_config) : null}::jsonb, share_config),
                updated_at = NOW()
            WHERE id = ${ctx.id}::uuid
        `;
        res.json({ success: true });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res.status(409).json({ error: 'Share ID already in use' });
        }
        console.error('Update share error:', error);
        res.status(500).json({ error: 'Failed to update sharing' });
    }
};

export const transferWebsite = async (req: Request, res: Response) => {
    try {
        const ctx = await authorize(req, res, { manage: true });
        if (!ctx) return;
        const { team_id } = req.body ?? {};
        if (typeof team_id !== 'string' || !UUID_RE.test(team_id)) {
            return res.status(400).json({ error: 'team_id is required' });
        }

        // The caller must belong to the destination team (superusers excepted).
        const [user] = await sql`SELECT role FROM users WHERE id = ${ctx.userId}::uuid`;
        if (user?.role !== 'superuser') {
            const member = await sql`
                SELECT 1 FROM team_members
                WHERE team_id = ${team_id}::uuid AND user_id = ${ctx.userId}::uuid
            `;
            if (member.length === 0) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        await sql`
            UPDATE websites SET team_id = ${team_id}::uuid, updated_at = NOW()
            WHERE id = ${ctx.id}::uuid
        `;
        res.json({ success: true });
    } catch (error) {
        console.error('Transfer website error:', error);
        res.status(500).json({ error: 'Failed to transfer website' });
    }
};
