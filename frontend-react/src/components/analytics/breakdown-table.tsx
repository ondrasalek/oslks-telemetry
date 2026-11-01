import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, Panel } from './section-card';

export interface BreakdownRow {
    key: string;
    label: ReactNode;
    /** Plain-text label, shown on hover when the row is truncated. */
    title?: string;
    primary: number;
    secondary?: number;
}

type SortKey = 'primary' | 'secondary';

interface BreakdownTableProps {
    rows: BreakdownRow[] | undefined;
    isLoading: boolean;
    /** Header of the name column ("Path", "Browser", ...). */
    nameLabel: string;
    primaryLabel: string;
    /** Omit when the rows carry no secondary figure. */
    secondaryLabel?: string;
    pageSize?: number;
    /** Monospace names, for paths and user agents. */
    mono?: boolean;
    emptyHint: string;
}

/**
 * A ranked list: name, a share bar, and one or two counts. Sortable by either count
 * and paged client-side, since the API already caps the list at the top N.
 */
export function BreakdownTable({
    rows,
    isLoading,
    nameLabel,
    primaryLabel,
    secondaryLabel,
    pageSize = 10,
    mono,
    emptyHint,
}: BreakdownTableProps) {
    const [sortBy, setSortBy] = useState<SortKey>('primary');
    const [page, setPage] = useState(0);

    const sorted = useMemo(
        () =>
            [...(rows ?? [])].sort(
                (a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0),
            ),
        [rows, sortBy],
    );
    const max = Math.max(1, ...sorted.map((r) => r.primary));
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const start = current * pageSize;
    const visible = sorted.slice(start, start + pageSize);

    const hasSecondary = !!secondaryLabel;
    // The share bar only appears once the table itself is wide enough (container
    // query, not viewport: the same table sits in half-width cards and full-width ones).
    const cols = hasSecondary
        ? 'grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] @md:grid-cols-[minmax(0,1fr)_5rem_3.5rem_3.5rem]'
        : 'grid-cols-[minmax(0,1fr)_3.5rem] @md:grid-cols-[minmax(0,1fr)_5rem_3.5rem]';

    const sortHeader = (key: SortKey, label: string) => (
        <button
            type='button'
            onClick={() => {
                setSortBy(key);
                setPage(0);
            }}
            className={cn(
                'flex items-center justify-end gap-0.5 transition-colors hover:text-foreground',
                sortBy === key && 'text-foreground',
            )}
        >
            {sortBy === key && <ChevronDown className='size-3' />}
            {label}
        </button>
    );

    if (!isLoading && sorted.length === 0) {
        return (
            <Panel>
                <EmptyState hint={emptyHint} />
            </Panel>
        );
    }

    return (
        <Panel className='@container overflow-hidden'>
            <div
                className={cn(
                    'grid items-center gap-x-3 px-3 py-2 text-xs font-medium text-muted-foreground',
                    cols,
                )}
            >
                <span>{nameLabel}</span>
                <span className='hidden @md:block' />
                {sortHeader('primary', primaryLabel)}
                {hasSecondary && sortHeader('secondary', secondaryLabel)}
            </div>

            {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className='border-t px-3 py-2'>
                          <Skeleton className='h-5 w-full' />
                      </div>
                  ))
                : visible.map((row) => (
                      <div
                          key={row.key}
                          className={cn(
                              'grid items-center gap-x-3 border-t px-3 py-2 text-sm transition-colors hover:bg-accent/40',
                              cols,
                          )}
                      >
                          <span
                              className={cn(
                                  'truncate',
                                  mono && 'font-mono text-xs',
                              )}
                              title={row.title}
                          >
                              {row.label}
                          </span>
                          <span className='hidden h-1 overflow-hidden rounded-full bg-muted @md:block'>
                              <span
                                  className='block h-full rounded-full bg-chart-1'
                                  style={{
                                      width: `${Math.max(2, (row.primary / max) * 100)}%`,
                                  }}
                              />
                          </span>
                          <span className='text-right font-semibold tabular-nums'>
                              {formatCompact(row.primary)}
                          </span>
                          {hasSecondary && (
                              <span className='text-right tabular-nums text-muted-foreground'>
                                  {row.secondary != null
                                      ? formatCompact(row.secondary)
                                      : '–'}
                              </span>
                          )}
                      </div>
                  ))}

            {!isLoading && sorted.length > pageSize && (
                <div className='flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground'>
                    <span>
                        {start + 1}–{start + visible.length} of {sorted.length}
                    </span>
                    <div className='flex gap-1'>
                        <Button
                            variant='ghost'
                            size='xs'
                            disabled={current === 0}
                            onClick={() => setPage(current - 1)}
                        >
                            Prev
                        </Button>
                        <Button
                            variant='ghost'
                            size='xs'
                            disabled={current >= pageCount - 1}
                            onClick={() => setPage(current + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </Panel>
    );
}
