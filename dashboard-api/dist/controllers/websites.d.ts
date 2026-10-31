import type { Request, Response } from 'express';
export declare const listWebsites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listAllWebsites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listTeamWebsites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteWebsite: (req: Request, res: Response) => Promise<void>;
export declare const resetWebsiteData: (req: Request, res: Response) => Promise<void>;
export declare const togglePinWebsite: (req: Request, res: Response) => Promise<void>;
export declare const updateWebsiteShare: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const transferWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** Public, unauthenticated view of a shared website (only what the share page needs). */
export declare const getSharedWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=websites.d.ts.map