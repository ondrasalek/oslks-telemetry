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

        res.json({ success: true, setting: settings[0] ?? null });
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

        res.json({ success: true, setting: settings[0] ?? null });
    } catch (error) {
        console.error('Get SMTP settings error:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP settings' });
    }
};

const saveSetting = (key: 'general' | 'smtp') => async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const value = req.body?.value;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return res.status(400).json({ success: false, error: 'Invalid settings payload' });
    }

    try {
        const [user] = await sql`SELECT role FROM users WHERE id = ${userId}::uuid LIMIT 1`;
        if (user?.role !== 'superuser') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await sql`
            INSERT INTO system_settings (key, value)
            VALUES (${key}, ${sql.json(value)})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
        res.json({ success: true });
    } catch (error) {
        console.error(`Save ${key} settings error:`, error);
        res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
};

export const saveGeneralSettings = saveSetting('general');
export const saveSmtpSettings = saveSetting('smtp');

export const sendTestEmail = (_req: Request, res: Response) => {
    res.status(501).json({
        success: false,
        error: 'Sending email is not available yet',
    });
};

/** Public feature flags the UI uses to decide what to render. */
export const getEnvConfig = (_req: Request, res: Response) => {
    // The API has no mailer, so email-based flows (invites) stay hidden.
    res.json({ smtp_enabled: false });
};
