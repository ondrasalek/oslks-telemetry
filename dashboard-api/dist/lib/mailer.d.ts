import type { Request } from 'express';
interface SmtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
}
/** SMTP settings live in `system_settings` (UI-managed or synced from env). */
export declare const getSmtpConfig: () => Promise<SmtpConfig | null>;
export declare const sendMail: (config: SmtpConfig, mail: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) => Promise<void>;
export declare const escapeHtml: (s: string) => string;
/** Public base URL of the dashboard: configured app_url, else the request's host. */
export declare const getAppUrl: (req: Request) => Promise<string>;
export {};
//# sourceMappingURL=mailer.d.ts.map