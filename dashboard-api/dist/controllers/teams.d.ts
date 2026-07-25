import type { Request, Response } from 'express';
export declare const listTeams: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listAllTeams: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeamMembers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeamWebsites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=teams.d.ts.map