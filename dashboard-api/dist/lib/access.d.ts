import type { Request } from 'express';
/**
 * True for a logged-in superuser session. API keys never get the bypass: their
 * reach stays bounded by the owner's team memberships and the key's team scope.
 */
export declare const isSuperuserSession: (req: Request, userId: string) => Promise<boolean>;
//# sourceMappingURL=access.d.ts.map