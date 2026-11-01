import type { ComponentProps, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
    title: string;
    /** Controls shown on the right of the title (toggles, legends). */
    actions?: ReactNode;
    /** Dim the body while a refreshed result is loading in behind the old one. */
    stale?: boolean;
    className?: string;
    children: ReactNode;
}

/** A dashboard section: underlined title on top, content below. */
export function SectionCard({
    title,
    actions,
    stale,
    className,
    children,
}: SectionCardProps) {
    return (
        <Card className={cn('gap-3 py-4 shadow-none', className)}>
            <CardHeader className='flex items-center justify-between gap-3 px-4'>
                <CardTitle className='text-sm font-semibold underline decoration-muted-foreground/40 decoration-1 underline-offset-4'>
                    {title}
                </CardTitle>
                {actions}
            </CardHeader>
            <CardContent
                className={cn(
                    'px-4 transition-opacity',
                    stale && 'opacity-60',
                )}
            >
                {children}
            </CardContent>
        </Card>
    );
}

/** The recessed panel inside a section card that holds tables and charts. */
export function Panel({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn('rounded-lg border bg-background', className)}
            {...props}
        />
    );
}

export function EmptyState({
    title = 'No data',
    hint,
}: {
    title?: string;
    hint: string;
}) {
    return (
        <div className='flex flex-col items-center justify-center gap-2 px-4 py-10 text-center'>
            <div className='flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground'>
                <Inbox className='size-4' />
            </div>
            <p className='text-sm font-semibold'>{title}</p>
            <p className='text-xs text-muted-foreground'>{hint}</p>
        </div>
    );
}
