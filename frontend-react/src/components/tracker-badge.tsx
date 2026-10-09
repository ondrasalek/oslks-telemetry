import { CircleCheck, CircleDashed, CircleAlert } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** No event for this long while events were seen before => "stale". */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface TrackerBadgeProps {
    lastEventAt: string | null | undefined;
    className?: string;
}

/** Shows whether the site's tracking snippet is actually delivering events. */
export function TrackerBadge({ lastEventAt, className }: TrackerBadgeProps) {
    if (!lastEventAt) {
        return (
            <Badge
                variant='outline'
                className={cn('text-muted-foreground', className)}
                title='No events received yet. Check that the snippet is installed and the site origin is whitelisted.'
            >
                <CircleDashed /> Not connected
            </Badge>
        );
    }

    const last = parseISO(lastEventAt);
    const ago = formatDistanceToNow(last, { addSuffix: true });
    const stale = Date.now() - last.getTime() > STALE_AFTER_MS;

    return stale ? (
        <Badge
            variant='outline'
            className={cn(
                'border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
                className,
            )}
            title={`Last event ${ago}`}
        >
            <CircleAlert /> No recent data
        </Badge>
    ) : (
        <Badge
            variant='outline'
            className={cn(
                'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                className,
            )}
            title={`Last event ${ago}`}
        >
            <CircleCheck /> Connected
        </Badge>
    );
}
