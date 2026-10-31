import type { Request, Response } from 'express';
/** What the collector publishes on the `radar_events` channel (see backend db/models.rs). */
export interface LiveEvent {
    website_id: string;
    type: string;
    name: string | null;
    url: string;
    country: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    at: string;
}
/**
 * Opens a Server-Sent Events stream of visits to one website. The caller must already have
 * authorised the request; `transform` lets public streams strip fields the owner didn't share.
 */
export declare const openLiveStream: (req: Request, res: Response, websiteId: string, transform?: (event: LiveEvent) => Partial<LiveEvent>) => Promise<void>;
//# sourceMappingURL=live.d.ts.map