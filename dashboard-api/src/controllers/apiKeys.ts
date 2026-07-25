import type { Request, Response } from 'express';
import sql from '../lib/db.js';
import { generateApiKey } from '../lib/apiKeys.js';

const MAX_NAME_LENGTH = 255;

export const listApiKeys = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const keys = await sql`
            SELECT k.id, k.name, k.key_prefix, k.team_id, t.name as team_name,
                   k.created_at, k.last_used_at
            FROM api_keys k
            LEFT JOIN teams t ON k.team_id = t.id
            WHERE k.user_id = ${userId}::uuid AND k.revoked_at IS NULL
            ORDER BY k.created_at DESC
        `;
        res.json(keys);
    } catch (error) {
        console.error('List API keys error:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
};

export const createApiKey = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { name, team_id } = req.body ?? {};

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
        return res
            .status(400)
            .json({ error: `Name must be at most ${MAX_NAME_LENGTH} characters` });
    }

    try {
        let finalTeamId = team_id || null;

        if (finalTeamId) {
            const members = await sql`
                SELECT 1 FROM team_members
                WHERE team_id = ${finalTeamId}::uuid AND user_id = ${userId}::uuid
                LIMIT 1
            `;
            if (members.length === 0)
                return res.status(403).json({ error: 'Forbidden' });
        } else {
            // Default to the user's primary team so the key inherits the same
            // team scope their session would have.
            const memberships = await sql`
                SELECT team_id FROM team_members
                WHERE user_id = ${userId}::uuid
                LIMIT 1
            `;
            finalTeamId = memberships[0]?.team_id ?? null;
        }

        if (!finalTeamId) {
            return res
                .status(400)
                .json({ error: 'You must belong to a team to create an API key' });
        }

        const { token, prefix, hash } = generateApiKey();

        const [key] = await sql`
            INSERT INTO api_keys (name, key_prefix, key_hash, user_id, team_id)
            VALUES (${name.trim()}, ${prefix}, ${hash}, ${userId}::uuid, ${finalTeamId}::uuid)
            RETURNING id, name, key_prefix, team_id, created_at, last_used_at
        `;

        console.log(`[ApiKey] Created key ${key?.id} for user ${userId}`);

        // The plaintext key is returned here and nowhere else, ever.
        res.status(201).json({ ...key, key: token });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
};

export const revokeApiKey = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const revoked = await sql`
            UPDATE api_keys
            SET revoked_at = NOW()
            WHERE id = ${id as string}::uuid
              AND user_id = ${userId}::uuid
              AND revoked_at IS NULL
            RETURNING id
        `;

        if (revoked.length === 0)
            return res.status(404).json({ error: 'API key not found' });

        console.log(`[ApiKey] Revoked key ${id} for user ${userId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Revoke API key error:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
};
