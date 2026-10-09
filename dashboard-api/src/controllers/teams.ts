import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import sql from '../lib/db.js';
import { escapeHtml, getAppUrl, getSmtpConfig, sendMail } from '../lib/mailer.js';

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
        const [viewer] = await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
        const superuser = viewer?.role === 'superuser';
        const teams = await sql`
            SELECT t.id, t.name, t.slug, t.icon_url, t.created_at, t.updated_at
            FROM teams t
            WHERE t.id = ${id}::uuid
              AND (${superuser}::boolean OR EXISTS (
                  SELECT 1 FROM team_members tm
                  WHERE tm.team_id = t.id AND tm.user_id = ${userId}::uuid
              ))
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

// ── Mutations ────────────────────────────────────────────

const TEAM_ROLES = ['member', 'admin'] as const;

const slugify = (name: string): string =>
    name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'team';

const uniqueSlug = (name: string): string =>
    `${slugify(name)}-${Math.random().toString(36).substring(2, 8)}`;

/** Resolves who the caller is and what they may do in a team. */
const teamAccess = async (userId: string, teamId: string) => {
    const [user] = await sql`SELECT role FROM users WHERE id = ${userId}::uuid`;
    const [member] = await sql`
        SELECT role FROM team_members
        WHERE team_id = ${teamId}::uuid AND user_id = ${userId}::uuid
    `;
    const isSuperuser = user?.role === 'superuser';
    const teamRole = (member?.role as string | undefined) ?? null;
    return {
        isSuperuser,
        teamRole,
        isMember: teamRole !== null,
        canManage: isSuperuser || teamRole === 'owner' || teamRole === 'admin',
        isOwner: isSuperuser || teamRole === 'owner',
    };
};

export const createTeam = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ Err: 'Team name is required' });

    try {
        const team = await sql.begin(async (tx: any) => {
            const [created] = await tx`
                INSERT INTO teams (name, slug)
                VALUES (${name}, ${uniqueSlug(name)})
                RETURNING id, name, slug, icon_url, created_at, updated_at
            `;
            await tx`
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${created.id}::uuid, ${userId}::uuid, 'owner')
            `;
            return created;
        });
        res.status(201).json({ Ok: team });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ Err: 'Failed to create team' });
    }
};

export const switchTeam = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const access = await teamAccess(userId, id);
        if (!access.isMember) return res.status(403).json({ error: 'Forbidden' });

        await sql`UPDATE users SET current_team_id = ${id}::uuid WHERE id = ${userId}::uuid`;
        res.json({ success: true });
    } catch (error) {
        console.error('Switch team error:', error);
        res.status(500).json({ error: 'Failed to switch team' });
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, slug } = req.body ?? {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return res.status(400).json({ error: 'Invalid name' });
    }
    if (slug !== undefined && (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug))) {
        return res.status(400).json({ error: 'Slug may only contain a-z, 0-9 and -' });
    }

    try {
        const access = await teamAccess(userId, id);
        if (!access.canManage) return res.status(403).json({ error: 'Forbidden' });

        const updated = await sql`
            UPDATE teams SET
                name = COALESCE(${name?.trim() ?? null}, name),
                slug = COALESCE(${slug ?? null}, slug),
                updated_at = NOW()
            WHERE id = ${id}::uuid
            RETURNING id
        `;
        if (updated.length === 0) return res.status(404).json({ error: 'Team not found' });
        res.json({ success: true });
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            return res.status(409).json({ error: 'Slug already in use' });
        }
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const access = await teamAccess(userId, id);
        if (!access.isOwner) return res.status(403).json({ error: 'Forbidden' });

        const deleted = await sql`DELETE FROM teams WHERE id = ${id}::uuid RETURNING id`;
        if (deleted.length === 0) return res.status(404).json({ error: 'Team not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
};

export const addTeamMember = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const role = req.body?.role ?? 'member';
    if (!email) return res.json({ success: false, error: 'Email is required' });
    if (!TEAM_ROLES.includes(role)) return res.json({ success: false, error: 'Invalid role' });

    try {
        const access = await teamAccess(userId, id);
        if (!access.canManage) return res.status(403).json({ success: false, error: 'Forbidden' });

        const [target] = await sql`SELECT id FROM users WHERE lower(email) = lower(${email})`;
        if (!target) {
            return res.json({
                success: false,
                error: 'No user with this email exists yet',
            });
        }

        const inserted = await sql`
            INSERT INTO team_members (team_id, user_id, role)
            VALUES (${id}::uuid, ${target.id}::uuid, ${role})
            ON CONFLICT (team_id, user_id) DO NOTHING
            RETURNING user_id
        `;
        if (inserted.length === 0) {
            return res.json({ success: false, error: 'User is already a member' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Add team member error:', error);
        res.status(500).json({ success: false, error: 'Failed to add member' });
    }
};

export const transferTeamOwnership = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const newOwnerId = req.body?.new_owner_id;
    if (typeof newOwnerId !== 'string') {
        return res.json({ success: false, error: 'new_owner_id is required' });
    }

    try {
        const access = await teamAccess(userId, id);
        if (!access.isOwner) return res.status(403).json({ success: false, error: 'Forbidden' });

        await sql.begin(async (tx: any) => {
            const [target] = await tx`
                SELECT 1 FROM team_members
                WHERE team_id = ${id}::uuid AND user_id = ${newOwnerId}::uuid
            `;
            if (!target) throw new Error('NOT_A_MEMBER');

            await tx`
                UPDATE team_members SET role = 'admin'
                WHERE team_id = ${id}::uuid AND role = 'owner'
            `;
            await tx`
                UPDATE team_members SET role = 'owner'
                WHERE team_id = ${id}::uuid AND user_id = ${newOwnerId}::uuid
            `;
        });
        res.json({ success: true });
    } catch (error) {
        if ((error as Error).message === 'NOT_A_MEMBER') {
            return res.json({ success: false, error: 'New owner must be a team member' });
        }
        console.error('Transfer ownership error:', error);
        res.status(500).json({ success: false, error: 'Failed to transfer ownership' });
    }
};

// ── Invitations ──────────────────────────────────────────

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const createInvite = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body?.role ?? 'member';
    if (!email) return res.json({ success: false, error: 'Email is required' });
    if (!TEAM_ROLES.includes(role)) return res.json({ success: false, error: 'Invalid role' });

    try {
        const access = await teamAccess(userId, id);
        if (!access.canManage) return res.status(403).json({ success: false, error: 'Forbidden' });

        const token = randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

        // One live invite per (team, email): re-inviting refreshes it.
        await sql`
            INSERT INTO team_invitations (team_id, email, role, token, invited_by, expires_at)
            VALUES (${id}::uuid, ${email}, ${role}, ${token}, ${userId}::uuid, ${expiresAt})
            ON CONFLICT (team_id, email) DO UPDATE SET
                role = EXCLUDED.role,
                token = EXCLUDED.token,
                invited_by = EXCLUDED.invited_by,
                expires_at = EXCLUDED.expires_at
        `;

        const smtp = await getSmtpConfig();
        if (!smtp) {
            // No mailer configured: the caller can still share the link by hand.
            return res.json({ success: true, token });
        }

        const [row] = await sql`
            SELECT t.name AS team_name, u.name AS inviter
            FROM teams t, users u
            WHERE t.id = ${id}::uuid AND u.id = ${userId}::uuid
        `;
        const link = `${await getAppUrl(req)}/invite/accept?token=${token}`;
        const teamName = row?.team_name ?? 'a team';
        const inviter = row?.inviter ?? 'A teammate';

        try {
            await sendMail(smtp, {
                to: email,
                subject: `${inviter} invited you to ${teamName} on OSLKS Radar`,
                text: `${inviter} invited you to join ${teamName} on OSLKS Radar.\n\nAccept the invitation: ${link}\n\nThis link expires in 7 days.`,
                html: `<p>${escapeHtml(inviter)} invited you to join <strong>${escapeHtml(teamName)}</strong> on OSLKS Radar.</p><p><a href="${link}">Accept the invitation</a></p><p>This link expires in 7 days.</p>`,
            });
        } catch (mailError) {
            console.error('Invite email error:', mailError);
            return res.json({
                success: false,
                error: `Invite saved, but the email could not be sent: ${(mailError as Error).message}`,
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Create invite error:', error);
        res.status(500).json({ success: false, error: 'Failed to create invite' });
    }
};

export const getInvite = async (req: Request, res: Response) => {
    const token = req.params.token as string;

    try {
        const [invite] = await sql`
            SELECT ti.id, ti.team_id, t.name AS team_name, ti.email, ti.role,
                   u.name AS invited_by_name, ti.expires_at
            FROM team_invitations ti
            JOIN teams t ON t.id = ti.team_id
            LEFT JOIN users u ON u.id = ti.invited_by
            WHERE ti.token = ${token} AND ti.expires_at > NOW()
        `;
        res.json(invite ?? null);
    } catch (error) {
        console.error('Get invite error:', error);
        res.status(500).json({ error: 'Failed to fetch invite' });
    }
};

export const acceptInvite = async (req: Request, res: Response) => {
    const token = req.params.token as string;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Please sign in first' });

    try {
        const [invite] = await sql`
            SELECT id, team_id, email, role FROM team_invitations
            WHERE token = ${token} AND expires_at > NOW()
        `;
        if (!invite) return res.json({ success: false, error: 'Invite is invalid or expired' });

        const [user] = await sql`SELECT email FROM users WHERE id = ${userId}::uuid`;
        if (user?.email?.toLowerCase() !== (invite.email as string).toLowerCase()) {
            return res.json({
                success: false,
                error: 'This invite was sent to a different email address',
            });
        }

        await sql.begin(async (tx: any) => {
            await tx`
                INSERT INTO team_members (team_id, user_id, role)
                VALUES (${invite.team_id}::uuid, ${userId}::uuid, ${invite.role})
                ON CONFLICT (team_id, user_id) DO NOTHING
            `;
            await tx`DELETE FROM team_invitations WHERE id = ${invite.id}::uuid`;
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ success: false, error: 'Failed to accept invite' });
    }
};
