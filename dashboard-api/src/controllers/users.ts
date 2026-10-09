import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import sql from '../lib/db.js';
import { getSmtpConfig, sendMail } from '../lib/mailer.js';

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

        const deleted = await sql.begin(async (tx: any) => {
            const [target] = await tx`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
            if (!target) return false;

            const teams = await tx`
                SELECT t.id, t.name, tm.role,
                       (SELECT COUNT(*)::int FROM team_members o
                         WHERE o.team_id = t.id AND o.user_id <> ${id}::uuid) AS others,
                       (SELECT COUNT(*)::int FROM websites w WHERE w.team_id = t.id) AS sites
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                WHERE tm.user_id = ${id}::uuid
            `;

            for (const team of teams) {
                if (team.others === 0) {
                    // Sole member: an empty team goes with them, one with sites blocks the delete
                    // (deleting a team cascades to its websites and all their events).
                    if (team.sites > 0) {
                        throw new DeleteBlocked(
                            `"${team.name}" has ${team.sites} website${team.sites === 1 ? '' : 's'} and this user is its only member. Transfer or delete those websites (or the team) first.`,
                        );
                    }
                    await tx`DELETE FROM teams WHERE id = ${team.id}::uuid`;
                } else if (team.role === 'owner') {
                    // Hand ownership to the longest-standing admin, else the longest-standing member.
                    await tx`
                        UPDATE team_members SET role = 'owner'
                        WHERE team_id = ${team.id}::uuid AND user_id = (
                            SELECT user_id FROM team_members
                            WHERE team_id = ${team.id}::uuid AND user_id <> ${id}::uuid
                            ORDER BY (role = 'admin') DESC, joined_at ASC
                            LIMIT 1
                        )
                    `;
                }
            }

            await tx`DELETE FROM users WHERE id = ${id}::uuid`;
            await endSessions(tx, id);
            return true;
        });

        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        if (error instanceof DeleteBlocked) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

class DeleteBlocked extends Error {}

/** Drops every login session of a user (sessions live in app_sessions). */
const endSessions = (db: any, userId: string) =>
    db`DELETE FROM app_sessions WHERE sess->>'userId' = ${userId}`;

// Unambiguous characters only (no 0/O, 1/l/I) so it survives being read out or retyped.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generatePassword = (length = 16): string =>
    Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');

/**
 * Issues a one-time password: sets it, flags the account so the user must pick
 * their own at next login, and signs out their existing sessions. The password
 * is emailed when SMTP works; otherwise it is returned once for the admin to relay.
 */
export const resetPassword = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (!(await isSuperuser(userId))) return res.status(403).json({ error: 'Forbidden' });
        if (id === userId) {
            return res.status(400).json({ error: 'Use your profile to change your own password' });
        }

        const password = generatePassword();
        const hashed = await bcrypt.hash(password, 10);

        const target = await sql.begin(async (tx: any) => {
            const [user] = await tx`
                UPDATE users SET password = ${hashed}, must_change_password = TRUE, updated_at = NOW()
                WHERE id = ${id}::uuid
                RETURNING email, name
            `;
            if (user) await endSessions(tx, id);
            return user;
        });
        if (!target) return res.status(404).json({ error: 'User not found' });

        const smtp = await getSmtpConfig();
        if (smtp) {
            try {
                await sendMail(smtp, {
                    to: target.email,
                    subject: 'Your OSLKS Radar password was reset',
                    text: `An administrator reset your password.\n\nOne-time password: ${password}\n\nSign in with it and you will be asked to choose a new password.`,
                });
                return res.json({ success: true, emailed: true });
            } catch (mailError) {
                console.error('Reset password email error:', mailError);
                return res.json({
                    success: true,
                    emailed: false,
                    password,
                    email_error: (mailError as Error).message,
                });
            }
        }
        res.json({ success: true, emailed: false, password });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
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

export const createUser = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email, password, role } = req.body ?? {};
    const finalRole = role ?? 'user';

    if (typeof email !== 'string' || !email.includes('@')) {
        return res.json({ success: false, error: 'A valid email is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!USER_ROLES.includes(finalRole)) {
        return res.json({ success: false, error: 'Invalid role' });
    }

    try {
        if (!(await isSuperuser(userId))) return res.status(403).json({ error: 'Forbidden' });

        const hashed = await bcrypt.hash(password, 10);

        const user = await sql.begin(async (tx: any) => {
            const [created] = await tx`
                INSERT INTO users (name, email, password, role)
                VALUES (${typeof name === 'string' && name ? name : null}, ${email.trim()}, ${hashed}, ${finalRole})
                RETURNING id, name, email, role, current_team_id, created_at, updated_at
            `;
            // Same bootstrap as self-registration: every user owns a Personal team.
            const [team] = await tx`
                INSERT INTO teams (name, slug)
                VALUES ('Personal', ${'personal-' + Math.random().toString(36).substring(2, 8)})
                RETURNING id
            `;
            await tx`
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${team.id}::uuid, ${created.id}::uuid, 'owner')
            `;
            return created;
        });
        res.status(201).json({ success: true, user });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res.json({ success: false, error: 'Email already in use' });
        }
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
};
