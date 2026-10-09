import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';

export const checkInstall = async (_req: Request, res: Response) => {
    try {
        const [row] = await sql`SELECT count(*)::int AS count FROM users`;
        res.json({ installed: (row?.count ?? 0) > 0, error: null });
    } catch (error) {
        console.error('Install check error:', error);
        res.json({ installed: false, error: 'Database connection failed' });
    }
};

/** First-run wizard: creates the initial superuser. Refuses once any user exists. */
export const setupInstall = async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.includes('@')) {
        return res.json({ success: false, error: 'A valid email is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.json({
            success: false,
            error: 'Password must be at least 8 characters',
        });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);

        const created = await sql.begin(async (tx: any) => {
            // Serialise concurrent setups so only one can win the race.
            await tx`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`;
            const [{ count }] = await tx`SELECT count(*)::int AS count FROM users`;
            if (count > 0) return false;

            const [user] = await tx`
                INSERT INTO users (name, email, password, role)
                VALUES (${typeof name === 'string' ? name : null}, ${email.trim()}, ${hashed}, 'superuser')
                RETURNING id
            `;
            const [team] = await tx`
                INSERT INTO teams (name, slug)
                VALUES ('Personal', ${'personal-' + Math.random().toString(36).substring(2, 8)})
                RETURNING id
            `;
            await tx`
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${team.id}::uuid, ${user.id}::uuid, 'owner')
            `;
            return true;
        });

        if (!created) {
            return res.json({ success: false, error: 'Already installed' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Install setup error:', error);
        res.status(500).json({ success: false, error: 'Installation failed' });
    }
};
