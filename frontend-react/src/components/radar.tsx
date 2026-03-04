import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function Radar({ className }: { className?: string }) {
    // Generate some random blips
    const blips = useMemo(() => {
        const ROTATION_DURATION = 6; // seconds
        return Array.from({ length: 5 }).map((_, i) => {
            const topPercent = Math.random() * 80 + 10;
            const leftPercent = Math.random() * 80 + 10;

            // Calculate angle for sync (0 degrees is top, clockwise)
            const y = topPercent - 50;
            const x = leftPercent - 50;
            const angleDeg =
                ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;

            // Calculate delay based on 6s rotation
            const syncDelay = (angleDeg / 360) * ROTATION_DURATION;

            return {
                id: i,
                top: `${topPercent}%`,
                left: `${leftPercent}%`,
                delay: `${syncDelay}s`,
                size: Math.random() * 4 + 2,
            };
        });
    }, []);

    return (
        <div
            className={cn(
                'relative flex items-center justify-center overflow-hidden border border-primary/5 rounded-full',
                className,
            )}
        >
            {/* Concentric distance rings */}
            <div className='absolute h-[25%] w-[25%] rounded-full border border-primary/10' />
            <div className='absolute h-[50%] w-[50%] rounded-full border border-primary/10' />
            <div className='absolute h-[75%] w-[75%] rounded-full border border-primary/10' />
            <div className='absolute h-[100%] w-[100%] rounded-full border border-primary/10' />

            {/* Pulsing effect rings */}
            <div className='absolute h-full w-full animate-radar-pulse rounded-full border border-primary/20 opacity-0' />
            <div className='absolute h-full w-full animate-radar-pulse rounded-full border border-primary/20 opacity-0 [animation-delay:2s]' />

            {/* Crosshair lines */}
            <div className='absolute h-px w-full bg-primary/5' />
            <div className='absolute h-full w-px bg-primary/5' />

            {/* Rotating scanner sweep */}
            <div className='absolute inset-0 animate-radar-spin'>
                <div className='absolute left-1/2 top-0 h-1/2 w-[100px] -translate-x-1/2 bg-gradient-to-t from-transparent to-primary/20 [clip-path:polygon(50%_100%,_0_0,_100%_0)]' />
                {/* Sweep line highlight */}
                <div className='absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.8)]' />
            </div>

            {/* Radar Blips */}
            {blips.map((blip) => (
                <div
                    key={blip.id}
                    className='absolute'
                    style={{ top: blip.top, left: blip.left }}
                >
                    {/* The core blip */}
                    <div
                        className='absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary'
                        style={{
                            width: `${blip.size}px`,
                            height: `${blip.size}px`,
                            boxShadow: '0 0 10px var(--primary)',
                            opacity: 0,
                            animation: `blip-pulse 6s infinite linear`,
                            animationDelay: blip.delay,
                        }}
                    />
                    {/* The echo ring */}
                    <div
                        className='absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary'
                        style={{
                            width: `${blip.size * 2}px`,
                            height: `${blip.size * 2}px`,
                            opacity: 0,
                            animation: `blip-echo 6s infinite linear`,
                            animationDelay: blip.delay,
                        }}
                    />
                </div>
            ))}

            <style>{`
                @keyframes blip-pulse {
                    0%, 2%, 15%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    5%, 10% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                }
                @keyframes blip-echo {
                    0%, 5% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
                    8% { opacity: 0.5; transform: translate(-50%, -50%) scale(3); }
                    15%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(4); }
                }
            `}</style>
        </div>
    );
}
