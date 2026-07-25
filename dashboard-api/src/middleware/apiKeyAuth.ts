import type { NextFunction, Request, Response } from 'express';
import sql from '../lib/db.js';
import { hashApiKey, hashesMatch, parseApiKey } from '../lib/apiKeys.js';

export interface ApiKeyContext {
    id: string;
    name: string;
    userId: string;
    teamId: string | null;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            apiKey?: ApiKeyContext;
        }
    }
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * Endpoints reachable with an API key (default deny — anything not listed here
 * is session-only, which keeps user/team administration and key management out
 * of reach of machine credentials).
 */
const ALLOWED_SCOPES: ReadonlyArray<{ method: string; pattern: RegExp }> = [
    { method: 'GET', pattern: /^\/api\/websites\/?$/ },
    { method: 'POST', pattern: /^\/api\/websites\/?$/ },
    { method: 'GET', pattern: new RegExp(`^/api/websites/${UUID}$`) },
    { method: 'GET', pattern: new RegExp(`^/api/websites/team/${UUID}$`) },
    {
        method: 'GET',
        pattern: new RegExp(`^/api/analytics/${UUID}/(stats|metrics|chart|active)$`),
    },
    { method: 'GET', pattern: new RegExp(`^/api/analytics/team/${UUID}/stats$`) },
];

const isInScope = (method: string, path: string): boolean =>
    ALLOWED_SCOPES.some(
        (scope) => scope.method === method && scope.pattern.test(path),
    );

/**
 * Reads the presented key from `Authorization: Bearer <key>` or `X-Api-Key`.
 * A non-Bearer Authorization header is ignored so that other schemes fall
 * through to the session path untouched.
 */
const extractToken = (req: Request): string | null => {
    const authorization = req.get('authorization');

    if (authorization) {
        const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
        return match ? (match[1] as string).trim() : null;
    }

    return req.get('x-api-key')?.trim() || null;
};

/**
 * Authenticates header-presented API keys and populates the same request
 * context the session path produces, so downstream controllers and their
 * team-membership checks work unchanged.
 *
 * Requests without a key pass straight through to the session middleware.
 */
export const apiKeyAuth = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const token = extractToken(req);
    if (!token) return next();

    const parsed = parseApiKey(token);
    if (!parsed) {
        console.warn(`[ApiKey] Malformed key presented for ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'Invalid API key' });
    }

    try {
        const candidates = await sql`
            SELECT id, name, user_id, team_id, key_hash, revoked_at
            FROM api_keys
            WHERE key_prefix = ${parsed.prefix}
        `;

        const presentedHash = hashApiKey(token);
        const key = candidates.find((candidate) =>
            hashesMatch(String(candidate.key_hash).trim(), presentedHash),
        );

        if (!key) {
            console.warn(
                `[ApiKey] Unknown key (prefix ${parsed.prefix}) for ${req.method} ${req.path}`,
            );
            return res.status(401).json({ error: 'Invalid API key' });
        }

        if (key.revoked_at) {
            console.warn(`[ApiKey] Revoked key ${key.id} used for ${req.method} ${req.path}`);
            return res.status(401).json({ error: 'API key has been revoked' });
        }

        if (!isInScope(req.method, req.path)) {
            console.warn(
                `[ApiKey] Key ${key.id} denied out-of-scope ${req.method} ${req.path}`,
            );
            return res.status(403).json({
                error: 'This endpoint is not available to API keys',
            });
        }

        req.apiKey = {
            id: key.id as string,
            name: key.name as string,
            userId: key.user_id as string,
            teamId: (key.team_id as string | null) ?? null,
        };

        // Mirror the session shape so controllers reading `req.session.userId`
        // behave identically. The session middleware is skipped for these
        // requests, so nothing is written to the session store.
        (req as any).session = {
            userId: key.user_id,
            apiKeyId: key.id,
            teamId: key.team_id ?? null,
        };

        // Best-effort — a failed touch must never fail the request.
        sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}::uuid`.catch(
            (error: unknown) => {
                console.error('[ApiKey] Failed to update last_used_at:', error);
            },
        );

        return next();
    } catch (error) {
        console.error('[ApiKey] Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

/** Rejects API-key credentials on session-only endpoints (keys cannot mint keys). */
export const sessionOnly = (req: Request, res: Response, next: NextFunction) => {
    if (req.apiKey) {
        return res.status(403).json({
            error: 'This endpoint requires an interactive session',
        });
    }
    return next();
};

/**
 * Confines a team-scoped API key to its own team. Reads `:team_id`, or resolves
 * the team of `:website_id` / `:id`. Session requests pass through untouched —
 * their existing membership checks already apply.
 */
export const enforceApiKeyTeamScope = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const teamId = req.apiKey?.teamId;
    if (!teamId) return next();

    const paramTeamId = req.params.team_id;
    if (paramTeamId) {
        if (paramTeamId !== teamId) {
            return res
                .status(403)
                .json({ error: 'API key is scoped to a different team' });
        }
        return next();
    }

    const websiteId = req.params.website_id ?? req.params.id;
    if (!websiteId) return next();

    try {
        const rows = await sql`
            SELECT 1 FROM websites
            WHERE id = ${websiteId}::uuid AND team_id = ${teamId}::uuid
            LIMIT 1
        `;
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Website not found' });
        }
        return next();
    } catch (error) {
        console.error('[ApiKey] Team scope check failed:', error);
        return res.status(500).json({ error: 'Authorization failed' });
    }
};
