import { cn } from '@/lib/utils';

/** A small pill switch between a few named options (Map/Globe, Countries/Cities). */
export function SegmentedToggle<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: readonly T[];
    onChange: (next: T) => void;
}) {
    return (
        <div className='inline-flex rounded-md border bg-background p-0.5 text-xs'>
            {options.map((option) => (
                <button
                    key={option}
                    type='button'
                    aria-pressed={value === option}
                    onClick={() => onChange(option)}
                    className={cn(
                        'rounded px-2.5 py-1 font-medium capitalize transition-colors',
                        value === option
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
