import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const users = await sql`
            SELECT id, email, name, password, role 
            FROM users 
            WHERE email = ${email}
            LIMIT 1
        `;
        const user = users[0];

        if (!user || !user.password) {
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }

        // Fetch primary team membership
        const memberships = await sql`
            SELECT team_id, role
            FROM team_members
            WHERE user_id = ${user.id}
            LIMIT 1
        `;
        const membership = memberships[0];

        // Store user in session
        (req.session as any).userId = user.id;

        const sessionUser = {
            id: user.id as string,
            email: user.email as string,
            name: user.name as string | null,
            role: user.role as string,
            teamId: membership?.team_id || null,
            teamRole: membership?.role || null,
        };

        res.json({ success: true, user: sessionUser });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    try {
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return res
                .status(409)
                .json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [user] = await sql`
            INSERT INTO users (name, email, password, role)
            VALUES (${name as string | null}, ${email as string}, ${hashedPassword as string}, 'user')
            RETURNING id, email, name, role
        `;

        if (!user) {
            throw new Error('Failed to create user');
        }

        (req.session as any).userId = user.id;

        res.status(201).json({
            success: true,
            user: {
                id: user.id as string,
                email: user.email as string,
                name: user.name as string | null,
                role: user.role as string,
                teamId: null,
                teamRole: null,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};

export const logout = (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res
                .status(500)
                .json({ success: false, error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
};

export const me = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;

    if (!userId) {
        return res.json(null);
    }

    try {
        const users = await sql`
            SELECT id, email, name, role 
            FROM users 
            WHERE id = ${userId}
            LIMIT 1
        `;
        const user = users[0];

        if (!user) {
            return res.json(null);
        }

        const memberships = await sql`
            SELECT team_id, role
            FROM team_members
            WHERE user_id = ${user.id}
            LIMIT 1
        `;
        const membership = memberships[0];

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teamId: membership?.team_id || null,
            teamRole: membership?.role || null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
