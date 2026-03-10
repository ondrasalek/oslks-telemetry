import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';

export const listUsers = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
        if (user.length === 0 || user[0].role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const users = await sql`
            SELECT id, name, email, role, current_team_id, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        `;

        res.json(users);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const currentUser =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
        if (currentUser.length === 0 || currentUser[0].role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const users = await sql`
            SELECT id, name, email, role, current_team_id, created_at, updated_at
            FROM users
            WHERE id = ${id}::uuid
            LIMIT 1
        `;

        if (users.length === 0)
            return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
