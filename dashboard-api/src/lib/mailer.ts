import type { Request } from 'express';
import nodemailer from 'nodemailer';
import sql from './db.js';

interface SmtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
}

/** SMTP settings live in `system_settings` (UI-managed or synced from env). */
export const getSmtpConfig = async (): Promise<SmtpConfig | null> => {
    const [row] = await sql`SELECT value FROM system_settings WHERE key = 'smtp' LIMIT 1`;
    const v = row?.value;
    if (!v || typeof v.host !== 'string' || !v.host.trim()) return null;

    return {
        host: v.host.trim(),
        port: Number(v.port) || 587,
        username: v.username || '',
        password: v.password || '',
        from_email: v.from_email || 'no-reply@example.com',
        from_name: v.from_name || 'OSLKS Radar',
    };
};

export const sendMail = async (
    config: SmtpConfig,
    mail: { to: string; subject: string; text: string; html?: string },
) => {
    const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: config.username
            ? { user: config.username, pass: config.password }
            : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });

    await transport.sendMail({
        from: { name: config.from_name, address: config.from_email },
        ...mail,
    });
};

export const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

/** Public base URL of the dashboard: configured app_url, else the request's host. */
export const getAppUrl = async (req: Request): Promise<string> => {
    const [row] = await sql`SELECT value FROM system_settings WHERE key = 'general' LIMIT 1`;
    const configured = row?.value?.app_url;
    if (typeof configured === 'string' && configured.trim()) {
        return configured.trim().replace(/\/+$/, '');
    }
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${req.protocol}://${host}`;
};
