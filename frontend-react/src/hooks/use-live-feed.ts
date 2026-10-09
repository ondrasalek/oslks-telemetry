import { useEffect, useState } from 'react';

/** One visit pushed from the collector. Fields the owner didn't share are absent. */
export interface LiveVisit {
    /** Local, monotonically increasing; lets the UI key and animate new rows. */
    id: number;
    type: string;
    at: string;
    name?: string | null;
    url?: string;
    country?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
}

let nextId = 0;

/**
 * Subscribes to a Server-Sent Events stream of visits and keeps the latest few, newest first.
 * EventSource reconnects by itself after a drop; a 401/403/404 closes it for good.
 */
export function useLiveFeed(url: string | null, max = 20) {
    const [visits, setVisits] = useState<LiveVisit[]>([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!url) return;
        const source = new EventSource(url);

        source.onopen = () => setConnected(true);
        source.onerror = () => setConnected(false);
        source.onmessage = (message) => {
            try {
                const visit = JSON.parse(message.data) as Omit<LiveVisit, 'id'>;
                setVisits((prev) =>
                    [{ ...visit, id: ++nextId }, ...prev].slice(0, max),
                );
            } catch {
                // Ignore a malformed frame; the next one is independent.
            }
        };

        return () => {
            source.close();
            setConnected(false);
            setVisits([]);
        };
    }, [url, max]);

    return { visits, connected };
}
