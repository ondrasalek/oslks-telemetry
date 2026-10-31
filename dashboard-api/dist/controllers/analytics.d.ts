import type { Request, Response } from 'express';
export declare const getStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveVisitors: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCountryStats: (req: Request, res: Response) => Promise<void>;
export declare const getCityStats: (req: Request, res: Response) => Promise<void>;
export declare const getRealtime: (req: Request, res: Response) => Promise<void>;
export declare const getChartData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTeamStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedChartData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedActiveVisitors: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedCountryStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** Public realtime: needs "stats"; pages and countries are only included when those are shared too. */
export declare const getSharedRealtime: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSharedCityStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** Live visits (SSE) for a website the caller can read. */
export declare const getLiveFeed: (req: Request, res: Response) => Promise<void>;
/** Public live visits (SSE); needs "stats", and omits pages / locations that aren't shared. */
export declare const getSharedLiveFeed: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=analytics.d.ts.map