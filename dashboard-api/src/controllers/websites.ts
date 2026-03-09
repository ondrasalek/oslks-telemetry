import type { Request, Response } from 'express';
import sql from '../lib/db.js';

export const listWebsites = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const websites = await sql`
            SELECT w.* 
            FROM websites w
            JOIN teams t ON w.team_id = t.id
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ${userId}
            ORDER BY w.created_at DESC
        `;
        res.json(websites);
    } catch (error) {
        console.error('List websites error:', error);
        res.status(500).json({ error: 'Failed to fetch websites' });
    }
};

export const createWebsite = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { name, domain, teamId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Ensure user is in the team
        if (teamId) {
            const members = await sql`
                SELECT 1 FROM team_members 
                WHERE team_id = ${teamId} AND user_id = ${userId}
            `;
            if (members.length === 0)
                return res.status(403).json({ error: 'Forbidden' });
        }

        const shareId = Math.random().toString(36).substring(2, 15);

        const [website] = await sql`
            INSERT INTO websites (name, domain, team_id, share_id)
            VALUES (${name || null}, ${domain}, ${teamId || null}, ${shareId})
            RETURNING *
        `;
        res.status(201).json(website);
    } catch (error) {
        console.error('Create website error:', error);
        res.status(500).json({ error: 'Failed to create website' });
    }
};

export const getWebsite = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const websites = await sql`
            SELECT w.* 
            FROM websites w
            JOIN teams t ON w.team_id = t.id
            JOIN team_members tm ON t.id = tm.team_id
            WHERE w.id = ${id as string} AND tm.user_id = ${userId}
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
