import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../lib/db.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMEMBER_MS = 30 * DAY_MS;

/**
 * "Remember this device": a persistent cookie that lives 30 days (sliding).
 * Otherwise a browser-session cookie; with no cookie expiry the session store
 * falls back to its default 1-day row TTL.
 */
const applySessionLifetime = (req: Request, remember: boolean) => {
    if (remember) {
        req.session.cookie.maxAge = REMEMBER_MS;
    } else {
        req.session.cookie.maxAge = undefined;
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password, remember } = req.body;
    console.log(`Login attempt for: ${email}`);

    try {
        const users = await sql`
            SELECT id, email, name, password, role, must_change_password 
            FROM users 
            WHERE email = ${email}
            LIMIT 1
        `;
        const user = users[0];

        if (!user || !user.password) {
            console.warn(
                `Login failed: user not found or no password for ${email}`,
            );
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.warn(`Login failed: invalid password for ${email}`);
            return res
                .status(401)
                .json({ success: false, error: 'Invalid credentials' });
        }

        // Fetch primary team membership
        const memberships = await sql`
            SELECT tm.team_id, tm.role
            FROM team_members tm
            JOIN users u ON u.id = tm.user_id
            WHERE tm.user_id = ${user.id}::uuid
            ORDER BY (tm.team_id = u.current_team_id) DESC, tm.joined_at ASC
            LIMIT 1
        `;
        const membership = memberships[0];

        // Store user in session
        (req.session as any).userId = user.id;
        (req.session as any).mustChangePassword = user.must_change_password === true;
        applySessionLifetime(req, remember === true);
        console.log(
            `Successfully logged in user ${user.id}. Session ID: ${req.sessionID}`,
        );

        const sessionUser = {
            id: user.id as string,
            email: user.email as string,
            name: user.name as string | null,
            role: user.role as string,
            team_id: membership?.team_id || null,
            team_role: membership?.role || null,
            must_change_password: user.must_change_password === true,
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
    console.log(`Registration attempt for: ${email}`);

    try {
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return res
                .status(409)
                .json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Use a transaction for registration
        const result = await sql.begin(async (tx: any) => {
            const [user] = await tx`
                INSERT INTO users (name, email, password, role)
                VALUES (${name as string | null}, ${email as string}, ${hashedPassword as string}, 'user')
                RETURNING id, email, name, role
            `;

            // Create a default "Personal" team for the user
            const [team] = await tx`
                INSERT INTO teams (name, slug)
                VALUES ('Personal', ${'personal-' + Math.random().toString(36).substring(2, 8)})
                RETURNING id
            `;

            // Make the user the owner of the team
            await tx`
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${team.id}::uuid, ${user.id}::uuid, 'owner')
            `;

            return { user, teamId: team.id };
        });

        const { user, teamId } = result;

        if (!user) {
            throw new Error('Failed to create user');
        }

        (req.session as any).userId = user.id;
        applySessionLifetime(req, true);
        console.log(
            `Registered and logged in user ${user.id}. Created personal team ${teamId}`,
        );

        res.status(201).json({
            success: true,
            user: {
                id: user.id as string,
                email: user.email as string,
                name: user.name as string | null,
                role: user.role as string,
                team_id: teamId as string,
                team_role: 'owner',
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
        res.clearCookie('oslks_session');
        res.json({ success: true });
    });
};

export const me = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;

    if (!userId) {
        console.log('Auth check (me): No userId in session');
        return res.json(null);
    }

    try {
        const users = await sql`
            SELECT id, email, name, role, must_change_password
            FROM users 
            WHERE id = ${userId}::uuid
            LIMIT 1
        `;
        const user = users[0];

        if (!user) {
            console.warn(`Auth check (me): User ${userId} not found in DB`);
            return res.json(null);
        }

        const memberships = await sql`
            SELECT tm.team_id, tm.role
            FROM team_members tm
            JOIN users u ON u.id = tm.user_id
            WHERE tm.user_id = ${user.id}::uuid
            ORDER BY (tm.team_id = u.current_team_id) DESC, tm.joined_at ASC
            LIMIT 1
        `;
        const membership = memberships[0];

        console.log(
            `Auth check (me): Authenticated user ${user.id} (Email: ${user.email})`,
        );

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            team_id: membership?.team_id || null,
            team_role: membership?.role || null,
            must_change_password: user.must_change_password === true,
        });
    } catch (error) {
        console.error('Auth check (me) error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { current_password, new_password } = req.body ?? {};
    if (typeof current_password !== 'string' || typeof new_password !== 'string') {
        return res.json({ success: false, error: 'Current and new password are required' });
    }
    if (new_password.length < 8) {
        return res.json({ success: false, error: 'New password must be at least 8 characters' });
    }
    if (new_password === current_password) {
        return res.json({ success: false, error: 'New password must differ from the current one' });
    }

    try {
        const [user] = await sql`SELECT password FROM users WHERE id = ${userId}::uuid LIMIT 1`;
        if (!user?.password || !(await bcrypt.compare(current_password, user.password))) {
            return res.json({ success: false, error: 'Current password is incorrect' });
        }

        const hashed = await bcrypt.hash(new_password, 10);
        await sql`
            UPDATE users SET password = ${hashed}, must_change_password = FALSE, updated_at = NOW()
            WHERE id = ${userId}::uuid
        `;
        (req.session as any).mustChangePassword = false;
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
