import type { Request, Response } from 'express';
import sql from '../lib/db.js';

export const listTeams = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const teams = await sql`
            SELECT t.id, t.name, t.slug, t.icon_url, t.created_at, t.updated_at
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ${userId}::uuid
            ORDER BY t.created_at ASC
        `;
        res.json(teams);
    } catch (error) {
        console.error('List teams error:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

export const getTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const teams = await sql`
            SELECT t.id, t.name, t.slug, t.icon_url, t.created_at, t.updated_at
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE t.id = ${id}::uuid AND tm.user_id = ${userId}::uuid
            LIMIT 1
        `;

        if (teams.length === 0)
            return res.status(404).json({ error: 'Team not found' });
        res.json(teams[0]);
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
};
