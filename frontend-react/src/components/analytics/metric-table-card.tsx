import { useMemo, type ReactNode } from 'react';
import { useMetrics, type AnalyticsScope } from '@/hooks/use-analytics';
import type { DateRange, MetricType } from '@/types/api';
import { BreakdownTable } from './breakdown-table';
import { SectionCard } from './section-card';

/** How many rows the API is asked for; the table pages through them client-side. */
const TOP_N = 50;

interface MetricTableCardProps {
    scope: AnalyticsScope;
    range: DateRange;
    metric: MetricType;
    title: string;
    nameLabel: string;
    mono?: boolean;
    /** Display form of a stored value; keep it a stable reference. */
    renderName?: (value: string) => ReactNode;
    className?: string;
}

/** A section card holding the top values of one event dimension. */
export function MetricTableCard({
    scope,
    range,
    metric,
    title,
    nameLabel,
    mono,
    renderName,
    className,
}: MetricTableCardProps) {
    const { data, isLoading, isPlaceholderData } = useMetrics(
        scope,
        metric,
        range,
        TOP_N,
    );

    const rows = useMemo(
        () =>
            data?.map((m) => ({
                key: m.value,
                label: renderName ? renderName(m.value) : m.value,
                title: m.value,
                primary: m.count,
                secondary: m.visitors,
            })),
        [data, renderName],
    );

    return (
        <SectionCard title={title} stale={isPlaceholderData} className={className}>
            <BreakdownTable
                rows={rows}
                isLoading={isLoading}
                nameLabel={nameLabel}
                primaryLabel='Views'
                secondaryLabel='Visitors'
                mono={mono}
                emptyHint={`No ${title.toLowerCase()} data for the selected range.`}
            />
        </SectionCard>
    );
}
