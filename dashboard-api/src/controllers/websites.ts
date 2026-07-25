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
            SELECT w.*, t.name as team_name
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
            SELECT w.* 
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
            SELECT w.id, w.domain, w.name, w.status, w.share_id, w.is_pinned, w.created_at, t.name as team_name, w.team_id
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
            SELECT w.*
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
