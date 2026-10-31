import type { Request, Response } from 'express';
export declare const listTeams: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listAllTeams: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeamMembers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeamWebsites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const switchTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addTeamMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const transferTeamOwnership: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createInvite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getInvite: (req: Request, res: Response) => Promise<void>;
export declare const acceptInvite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=teams.d.ts.map