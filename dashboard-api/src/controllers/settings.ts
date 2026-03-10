import type { Request, Response } from 'express';
import sql from '../lib/db.js';

export const getGeneralSettings = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const settings = await sql`
            SELECT key, value, created_at, updated_at
            FROM system_settings
            WHERE key = 'general'
            LIMIT 1
        `;

        if (settings.length === 0) return res.json(null);
        res.json(settings[0]);
    } catch (error) {
        console.error('Get general settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const getSmtpSettings = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user =
            await sql`SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
        if (user.length === 0 || user[0].role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const settings = await sql`
            SELECT key, value, created_at, updated_at
            FROM system_settings
            WHERE key = 'smtp'
            LIMIT 1
        `;

        if (settings.length === 0) return res.json(null);
        res.json(settings[0]);
    } catch (error) {
        console.error('Get SMTP settings error:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP settings' });
    }
};
