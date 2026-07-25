import type { NextFunction, Request, Response } from 'express';
export interface ApiKeyContext {
    id: string;
    name: string;
    userId: string;
    teamId: string | null;
}
declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKeyContext;
        }
    }
}
/**
 * Authenticates header-presented API keys and populates the same request
 * context the session path produces, so downstream controllers and their
 * team-membership checks work unchanged.
 *
 * Requests without a key pass straight through to the session middleware.
 */
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/** Rejects API-key credentials on session-only endpoints (keys cannot mint keys). */
export declare const sessionOnly: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Confines a team-scoped API key to its own team. Reads `:team_id`, or resolves
 * the team of `:website_id` / `:id`. Session requests pass through untouched —
 * their existing membership checks already apply.
 */
export declare const enforceApiKeyTeamScope: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=apiKeyAuth.d.ts.map