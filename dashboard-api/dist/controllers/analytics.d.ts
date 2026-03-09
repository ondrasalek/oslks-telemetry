import type { Request, Response } from 'express';
export declare const getStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveVisitors: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getChartData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=analytics.d.ts.map