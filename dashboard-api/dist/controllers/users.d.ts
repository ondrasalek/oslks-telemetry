import type { Request, Response } from 'express';
export declare const listUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Issues a one-time password: sets it, flags the account so the user must pick
 * their own at next login, and signs out their existing sessions. The password
 * is emailed when SMTP works; otherwise it is returned once for the admin to relay.
 */
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** Self-service profile edit (name / email). */
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=users.d.ts.map