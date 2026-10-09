import type { Request, Response } from 'express';
import sql from './db.js';

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

interface Client {
    send: (event: LiveEvent) => void;
}

const CHANNEL = 'radar_events';
const HEARTBEAT_MS = 25_000;
// Streams end after this so access (membership, share settings) is re-checked on reconnect;
// EventSource reconnects on its own.
const MAX_STREAM_MS = 30 * 60_000;
const MAX_CLIENTS = 500;

const clients = new Map<string, Set<Client>>();
let clientCount = 0;
let listening: Promise<unknown> | null = null;

/** One shared LISTEN connection for the whole process (postgres.js re-listens on reconnect). */
const ensureListening = (): Promise<unknown> => {
    listening ??= sql
        .listen(CHANNEL, (payload) => {
            try {
                const event = JSON.parse(payload) as LiveEvent;
                clients.get(event.website_id)?.forEach((c) => c.send(event));
            } catch {
                // Ignore malformed payloads rather than crash the listener.
            }
        })
        .catch((error) => {
            listening = null; // retry on the next subscriber
            throw error;
        });
    return listening;
};

/**
 * Opens a Server-Sent Events stream of visits to one website. The caller must already have
 * authorised the request; `transform` lets public streams strip fields the owner didn't share.
 */
export const openLiveStream = async (
    req: Request,
    res: Response,
    websiteId: string,
    transform: (event: LiveEvent) => Partial<LiveEvent> = (e) => e,
): Promise<void> => {
    if (clientCount >= MAX_CLIENTS) {
        res.status(503).json({ error: 'Too many live connections' });
        return;
    }

    try {
        await ensureListening();
    } catch (error) {
        console.error('[Live] LISTEN failed:', error);
        res.status(503).json({ error: 'Live feed unavailable' });
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');

    const client: Client = {
        send: (event) => res.write(`data: ${JSON.stringify(transform(event))}\n\n`),
    };
    let set = clients.get(websiteId);
    if (!set) clients.set(websiteId, (set = new Set()));
    set.add(client);
    clientCount++;

    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    const lifetime = setTimeout(() => res.end(), MAX_STREAM_MS);

    req.on('close', () => {
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        set.delete(client);
        if (set.size === 0) clients.delete(websiteId);
        clientCount--;
    });
};
