import type { Request, Response } from 'express';
export declare const checkInstall: (_req: Request, res: Response) => Promise<void>;
/** First-run wizard: creates the initial superuser. Refuses once any user exists. */
export declare const setupInstall: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=install.d.ts.map