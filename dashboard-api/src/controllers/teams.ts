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

export const listAllTeams = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
        if (user[0]?.role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const teams = await sql`
            SELECT t.id, t.name, t.slug, t.created_at, COUNT(tm.user_id)::int as member_count
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `;
        res.json(teams);
    } catch (error) {
        console.error('List all teams error:', error);
        res.status(500).json({ error: 'Failed to fetch all teams' });
    }
};

export const getTeamMembers = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
        const members = await sql`
            SELECT 1 FROM team_members 
            WHERE team_id = ${id}::uuid AND user_id = ${userId}::uuid
        `;

        if (members.length === 0 && user[0]?.role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const teamMembers = await sql`
            SELECT tm.user_id, u.name as user_name, u.email as user_email, tm.role, tm.joined_at
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ${id}::uuid
            ORDER BY tm.joined_at ASC
        `;
        res.json(teamMembers);
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
};

export const getTeamWebsites = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
        const members = await sql`
            SELECT 1 FROM team_members 
            WHERE team_id = ${id}::uuid AND user_id = ${userId}::uuid
        `;

        if (members.length === 0 && user[0]?.role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const websites = await sql`
            SELECT w.id, w.domain, w.name, w.status, w.icon_url, w.created_at
            FROM websites w
            WHERE w.team_id = ${id}::uuid
            ORDER BY w.created_at DESC
        `;
        res.json(websites);
    } catch (error) {
        console.error('Get team websites error:', error);
        res.status(500).json({ error: 'Failed to fetch team websites' });
    }
};
