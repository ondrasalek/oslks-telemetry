import { useEffect, useMemo, useRef, useState } from 'react';
import {
    geoCentroid,
    geoContains,
    geoDistance,
    geoGraticule10,
    geoOrthographic,
    geoPath,
} from 'd3-geo';
import { alpha2ToNumeric } from 'i18n-iso-countries';
import { cn } from '@/lib/utils';
import { loadWorld, type CountryFeature } from '@/lib/world';

export interface GlobePoint {
    lat: number;
    lng: number;
    /** Sizes the dot relative to the busiest point. */
    visitors: number;
    label?: string;
}

interface GlobeProps {
    /** ISO alpha-2 country code -> visitors; tints the countries. */
    data?: { value: string; visitors: number }[];
    points?: GlobePoint[];
    /**
     * A decorative backdrop: quiet colours, pulsing dots, no hover or dragging, hidden
     * from assistive tech. `className` must give the box its size.
     */
    ambient?: boolean;
    className?: string;
}

type Rotation = [number, number];
type Hover = { name: string; visitors: number };

// Stable defaults: a fresh `[]` per render would rebuild the scene every time.
const NO_DATA: NonNullable<GlobeProps['data']> = [];
const NO_POINTS: GlobePoint[] = [];

const SPHERE = { type: 'Sphere' } as const;
const PADDING = 6;
const SPIN_DEG_PER_S = 7;
const AMBIENT_SPIN_DEG_PER_S = 4;
/** After a drag, wait this long before the globe starts turning again. */
const RESUME_AFTER_MS = 2500;
const MAX_TILT = 75;

/** Canvas cannot resolve `var(--x)`, so read the theme tokens as concrete colours. */
function readColors(el: Element) {
    const style = getComputedStyle(el);
    const token = (name: string) => style.getPropertyValue(name).trim();
    return {
        primary: token('--primary'),
        muted: token('--muted'),
        background: token('--background'),
        dark: document.documentElement.classList.contains('dark'),
    };
}
type Colors = ReturnType<typeof readColors>;

/** Face the busiest country (or Europe/Africa when there is no data), tilted a little north. */
function startRotation(
    features: CountryFeature[],
    byId: Map<string, number>,
    ambient: boolean,
): Rotation {
    const fallback: Rotation = ambient ? [-12, -24] : [-10, -25];
    let topId: string | null = null;
    let top = 0;
    for (const [id, visitors] of byId) {
        if (visitors > top) {
            top = visitors;
            topId = id;
        }
    }
    const feature = topId && features.find((f) => String(f.id) === topId);
    if (!feature) return fallback;
    const [lng, lat] = geoCentroid(feature);
    return [-lng, -Math.max(-35, Math.min(35, lat))];
}

/**
 * A draggable, slowly turning globe. Same data as the flat map (visitors per country,
 * dots per city); the frame loop only runs while the canvas is on screen.
 */
export default function Globe({
    data = NO_DATA,
    points = NO_POINTS,
    ambient = false,
    className,
}: GlobeProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Lives outside the effect so a new range or theme does not snap the globe back.
    const rotationRef = useRef<Rotation | null>(null);
    const [features, setFeatures] = useState<CountryFeature[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [hover, setHover] = useState<Hover | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadWorld()
            .then((all) => !cancelled && setFeatures(all))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, []);

    // Numeric id (what the atlas uses) -> visitors.
    const { byId, max } = useMemo(() => {
        const byId = new Map<string, number>();
        for (const row of data) {
            const id = alpha2ToNumeric(row.value.toUpperCase());
            if (id) byId.set(id, (byId.get(id) ?? 0) + row.visitors);
        }
        return { byId, max: Math.max(0, ...byId.values()) };
    }, [data]);

    // Biggest first, so small dots stay on top and hoverable.
    const sortedPoints = useMemo(
        () => [...points].sort((a, b) => b.visitors - a.visitors),
        [points],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !wrap || !ctx || !features) return;

        rotationRef.current ??= startRotation(features, byId, ambient);
        const rotation = rotationRef.current;

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const spin = reduceMotion
            ? 0
            : ambient
              ? AMBIENT_SPIN_DEG_PER_S
              : SPIN_DEG_PER_S;
        const maxPoint = Math.max(1, ...sortedPoints.map((p) => p.visitors));

        const projection = geoOrthographic().precision(0.5);
        const path = geoPath(projection, ctx);
        const graticule = geoGraticule10();

        let colors: Colors = readColors(wrap);
        let fills = new Map<string, string>();
        const buildFills = () => {
            fills = new Map();
            const idle = `color-mix(in oklab, ${colors.primary} 12%, ${colors.muted})`;
            for (const f of features) {
                const visitors = byId.get(String(f.id)) ?? 0;
                // sqrt keeps a single huge country from washing out the rest.
                const strength =
                    visitors && max
                        ? 25 + 75 * Math.sqrt(visitors / max)
                        : 0;
                fills.set(
                    String(f.id),
                    strength
                        ? `color-mix(in oklab, ${colors.primary} ${strength.toFixed(0)}%, ${colors.muted})`
                        : idle,
                );
            }
        };
        buildFills();

        // ── interaction state ────────────────────────────────
        let dirty = true;
        let dragging = false;
        let hovering = false;
        let resumeAt = 0;
        let lastX = 0;
        let lastY = 0;
        let pointer: { x: number; y: number } | null = null;
        let pointerMoved = false;
        let hoverKey: string | null = null;
        let hoveredFeature: CountryFeature | null = null;
        const hits: { x: number; y: number; r: number; hover: Hover }[] = [];

        let width = 0;
        let height = 0;
        let dpr = 1;
        const resize = () => {
            const box = wrap.getBoundingClientRect();
            width = box.width;
            height = box.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
            projection
                .translate([width / 2, height / 2])
                .scale(Math.max(10, Math.min(width, height) / 2 - PADDING));
            dirty = true;
        };

        const hitTest = (): {
            key: string;
            hover: Hover;
            feature: CountryFeature | null;
        } | null => {
            if (!pointer) return null;
            // Dots sit on top of the countries, and the smallest were drawn last.
            for (let i = hits.length - 1; i >= 0; i--) {
                const h = hits[i];
                if (Math.hypot(pointer.x - h.x, pointer.y - h.y) <= h.r) {
                    return {
                        key: `p:${h.hover.name}`,
                        hover: h.hover,
                        feature: null,
                    };
                }
            }
            const [cx, cy] = projection.translate();
            if (
                Math.hypot(pointer.x - cx, pointer.y - cy) > projection.scale()
            ) {
                return null;
            }
            const at = projection.invert?.([pointer.x, pointer.y]);
            if (!at || Number.isNaN(at[0])) return null;
            const feature = features.find((f) => geoContains(f, at));
            if (!feature) return null;
            return {
                key: `c:${feature.id}`,
                hover: {
                    name: feature.properties.name,
                    visitors: byId.get(String(feature.id)) ?? 0,
                },
                feature,
            };
        };

        // ── drawing ──────────────────────────────────────────
        const draw = (now: number) => {
            projection.rotate(rotation);
            const r = projection.scale();
            const [cx, cy] = projection.translate();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (!ambient) {
                ctx.beginPath();
                path(SPHERE);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = colors.muted;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            ctx.beginPath();
            path(graticule);
            ctx.globalAlpha = ambient ? 0.05 : 0.12;
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;

            if (ambient) ctx.globalAlpha = 0.07;
            for (const f of features) {
                ctx.beginPath();
                path(f);
                ctx.fillStyle = ambient
                    ? colors.primary
                    : (fills.get(String(f.id)) ?? colors.muted);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            ctx.beginPath();
            for (const f of features) path(f);
            ctx.globalAlpha = ambient ? 0.18 : 1;
            ctx.strokeStyle = ambient ? colors.primary : colors.background;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;

            if (hoveredFeature) {
                ctx.beginPath();
                path(hoveredFeature);
                ctx.strokeStyle = colors.primary;
                ctx.lineWidth = 1.25;
                ctx.stroke();
            }

            if (!ambient) {
                // A highlight up-left and a darker limb make the disc read as a ball.
                const shade = ctx.createRadialGradient(
                    cx - r * 0.35,
                    cy - r * 0.4,
                    r * 0.15,
                    cx,
                    cy,
                    r,
                );
                shade.addColorStop(0, 'rgba(255,255,255,0.07)');
                shade.addColorStop(0.7, 'rgba(0,0,0,0)');
                shade.addColorStop(
                    1,
                    colors.dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)',
                );
                ctx.beginPath();
                path(SPHERE);
                ctx.fillStyle = shade;
                ctx.fill();
            }

            // Dots on the near side only.
            hits.length = 0;
            const facing: [number, number] = [-rotation[0], -rotation[1]];
            const scale = Math.min(1.4, Math.max(0.7, r / 200));
            sortedPoints.forEach((p, i) => {
                if (geoDistance([p.lng, p.lat], facing) > Math.PI / 2 - 0.03) {
                    return;
                }
                const xy = projection([p.lng, p.lat]);
                if (!xy) return;
                const [base, extra] = ambient ? [1.6, 3] : [2.5, 7];
                const radius =
                    (base + extra * Math.sqrt(p.visitors / maxPoint)) * scale;
                if (ambient && !reduceMotion) {
                    const phase = (now / 2000 + i * 0.37) % 1;
                    ctx.beginPath();
                    ctx.arc(
                        xy[0],
                        xy[1],
                        radius + phase * radius * 4,
                        0,
                        Math.PI * 2,
                    );
                    ctx.globalAlpha = (1 - phase) * 0.3;
                    ctx.strokeStyle = colors.primary;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(xy[0], xy[1], radius, 0, Math.PI * 2);
                ctx.globalAlpha = ambient ? 0.4 : 0.75;
                ctx.fillStyle = colors.primary;
                ctx.fill();
                ctx.globalAlpha = 1;
                if (!ambient) {
                    ctx.strokeStyle = colors.background;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    hits.push({
                        x: xy[0],
                        y: xy[1],
                        r: radius + 3,
                        hover: {
                            name: p.label || 'Unknown city',
                            visitors: p.visitors,
                        },
                    });
                }
            });
            ctx.globalAlpha = 1;

            ctx.beginPath();
            path(SPHERE);
            ctx.globalAlpha = ambient ? 0.22 : 0.25;
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;
        };

        // ── frame loop (only while visible) ──────────────────
        let raf = 0;
        let last = 0;
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            const dt = last ? Math.min(now - last, 100) : 0;
            last = now;

            if (spin && !dragging && !hovering && now >= resumeAt) {
                rotation[0] += (spin * dt) / 1000;
                dirty = true;
            }
            if (pointerMoved) {
                pointerMoved = false;
                const hit = dragging ? null : hitTest();
                const key = hit?.key ?? null;
                if (key !== hoverKey) {
                    hoverKey = key;
                    hoveredFeature = hit?.feature ?? null;
                    setHover(hit?.hover ?? null);
                    dirty = true;
                }
            }
            if (dirty || (ambient && !reduceMotion)) {
                dirty = false;
                draw(now);
            }
        };
        const start = () => {
            if (!raf) {
                last = 0;
                raf = requestAnimationFrame(tick);
            }
        };
        const stop = () => {
            cancelAnimationFrame(raf);
            raf = 0;
        };

        const sizeObserver = new ResizeObserver(resize);
        sizeObserver.observe(wrap);
        const visibility = new IntersectionObserver(([entry]) =>
            entry?.isIntersecting ? start() : stop(),
        );
        visibility.observe(wrap);
        const themeObserver = new MutationObserver(() => {
            colors = readColors(wrap);
            buildFills();
            dirty = true;
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        // ── pointer handlers (not for a decorative backdrop) ─
        const local = (e: PointerEvent) => {
            const box = canvas.getBoundingClientRect();
            return { x: e.clientX - box.left, y: e.clientY - box.top };
        };
        const onDown = (e: PointerEvent) => {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
        };
        const onMove = (e: PointerEvent) => {
            pointer = local(e);
            pointerMoved = true;
            if (!dragging) return;
            // 1px of drag moves the surface under the cursor by ~1px at the centre.
            const perPx = 57.3 / projection.scale();
            rotation[0] += (e.clientX - lastX) * perPx;
            // Touch keeps vertical movement for scrolling the page.
            if (e.pointerType === 'mouse') {
                rotation[1] = Math.max(
                    -MAX_TILT,
                    Math.min(
                        MAX_TILT,
                        rotation[1] - (e.clientY - lastY) * perPx,
                    ),
                );
            }
            lastX = e.clientX;
            lastY = e.clientY;
            dirty = true;
        };
        const onUp = () => {
            dragging = false;
            resumeAt = performance.now() + RESUME_AFTER_MS;
            canvas.style.cursor = 'grab';
        };
        const onEnter = () => {
            hovering = true;
        };
        const onLeave = () => {
            hovering = false;
            pointer = null;
            pointerMoved = true;
        };
        if (!ambient) {
            canvas.style.cursor = 'grab';
            canvas.addEventListener('pointerdown', onDown);
            canvas.addEventListener('pointermove', onMove);
            canvas.addEventListener('pointerup', onUp);
            canvas.addEventListener('pointercancel', onUp);
            canvas.addEventListener('pointerenter', onEnter);
            canvas.addEventListener('pointerleave', onLeave);
        }

        resize();
        return () => {
            stop();
            sizeObserver.disconnect();
            visibility.disconnect();
            themeObserver.disconnect();
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('pointerenter', onEnter);
            canvas.removeEventListener('pointerleave', onLeave);
        };
    }, [features, byId, max, sortedPoints, ambient]);

    if (failed) {
        return ambient ? null : (
            <p className='py-8 text-center text-sm text-muted-foreground'>
                The globe could not be loaded.
            </p>
        );
    }

    const box = (
        <div ref={wrapRef} className={cn('relative', className)}>
            <canvas
                ref={canvasRef}
                className='absolute inset-0 size-full touch-pan-y'
                role={ambient ? undefined : 'img'}
                aria-label={
                    ambient ? undefined : 'Globe of visitors by country'
                }
                aria-hidden={ambient || undefined}
            />
        </div>
    );
    if (ambient) return box;

    return (
        <div className='space-y-2'>
            {box}
            <div className='flex h-5 items-center justify-between gap-3 text-xs text-muted-foreground'>
                <span className='min-w-0 truncate'>
                    {hover
                        ? `${hover.name}: ${hover.visitors} ${hover.visitors === 1 ? 'visitor' : 'visitors'}`
                        : features
                          ? 'Drag to rotate'
                          : 'Loading globe…'}
                </span>
                <span className='flex shrink-0 items-center gap-2'>
                    Fewer
                    <span
                        className='h-2 w-24 rounded-full'
                        style={{
                            background:
                                'linear-gradient(to right, color-mix(in oklab, var(--primary) 25%, var(--muted)), var(--primary))',
                        }}
                    />
                    More
                </span>
            </div>
        </div>
    );
}
