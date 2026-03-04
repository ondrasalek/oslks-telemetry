import { useEffect, useRef } from 'react';
import { useCookieStore } from '@/lib/store';

export function Analytics() {
    const consent = useCookieStore((state) => state.consent);
    const oslksId = import.meta.env.VITE_OSLKS_WEBSITE_ID;
    const oslksCollector = import.meta.env.VITE_OSLKS_COLLECTOR_URL;

    const oslksRef = useRef<HTMLScriptElement | null>(null);

    useEffect(() => {
        if (!consent.analytics) {
            // Remove scripts if consent was revoked
            if (oslksRef.current) {
                document.head.removeChild(oslksRef.current);
                oslksRef.current = null;
            }
            return;
        }

        // Inject OSLKS script
        if (oslksId && oslksCollector) {
            const oslks = document.createElement('script');
            oslks.src = `${oslksCollector}/lib/j`;
            oslks.setAttribute('data-website-id', oslksId);
            oslks.setAttribute('data-host-url', oslksCollector);
            oslks.async = true;
            document.head.appendChild(oslks);
            oslksRef.current = oslks;
        }

        return () => {
            if (oslksRef.current) {
                document.head.removeChild(oslksRef.current);
                oslksRef.current = null;
            }
        };
    }, [consent.analytics, oslksId, oslksCollector]);
    return null;
}
