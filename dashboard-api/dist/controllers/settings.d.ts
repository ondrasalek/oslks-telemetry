import type { Request, Response } from 'express';
export declare const getGeneralSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSmtpSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const saveGeneralSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const saveSmtpSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendTestEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** Public feature flags the UI uses to decide what to render. */
export declare const getEnvConfig: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=settings.d.ts.map