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

const USER_ROLES = ['user', 'admin', 'superuser'];

const isSuperuser = async (userId: string) => {
    const [user] = await sql`SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
    return user?.role === 'superuser';
};

export const updateUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email, role } = req.body ?? {};
    if (role !== undefined && !USER_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    if (email !== undefined && (typeof email !== 'string' || !email.includes('@'))) {
        return res.status(400).json({ error: 'Invalid email' });
    }

    try {
        if (!(await isSuperuser(userId))) return res.status(403).json({ error: 'Forbidden' });
        // Prevent locking the instance out of its last superuser.
        if (id === userId && role !== undefined && role !== 'superuser') {
            return res.status(400).json({ error: 'You cannot demote yourself' });
        }

        const updated = await sql`
            UPDATE users SET
                name = COALESCE(${name ?? null}, name),
                email = COALESCE(${email?.trim() ?? null}, email),
                role = COALESCE(${role ?? null}, role),
                updated_at = NOW()
            WHERE id = ${id}::uuid
            RETURNING id
        `;
        if (updated.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (!(await isSuperuser(userId))) return res.status(403).json({ error: 'Forbidden' });
        if (id === userId) return res.status(400).json({ error: 'You cannot delete yourself' });

        const deleted = await sql`DELETE FROM users WHERE id = ${id}::uuid RETURNING id`;
        if (deleted.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

/** Self-service profile edit (name / email). */
export const updateProfile = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { name, email } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email' });
    }

    try {
        await sql`
            UPDATE users SET
                name = ${typeof name === 'string' ? name : null},
                email = ${email.trim()},
                updated_at = NOW()
            WHERE id = ${userId}::uuid
        `;
        res.json({ success: true });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};
