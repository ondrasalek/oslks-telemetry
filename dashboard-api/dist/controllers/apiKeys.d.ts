import type { Request, Response } from 'express';
export declare const listApiKeys: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createApiKey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const revokeApiKey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=apiKeys.d.ts.map