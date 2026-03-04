import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    Activity,
    Github,
    Zap,
    Globe,
    Lock,
    ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Radar } from '@/components/radar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function HomePage() {
    return (
        <div className='flex min-h-screen flex-col bg-background'>
            {/* ── Navbar ───────────────────────────────────────── */}
            <header className='sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg'>
                <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6'>
                    <Link to='/' className='flex items-center gap-2'>
                        <img
                            src='/icon.svg'
                            alt='OSLKS Radar'
                            className='h-8 w-8'
                        />
                        <span className='text-lg font-bold tracking-tight'>
                            OSLKS Radar
                        </span>
                    </Link>
                    <nav className='flex items-center gap-2'>
                        <a
                            href='https://github.com/ondrasalek/oslks-telemetry'
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            <Button variant='ghost' size='sm' className='gap-2'>
                                <Github className='h-4 w-4' />
                                <span className='hidden sm:inline'>GitHub</span>
                            </Button>
                        </a>
                        <Link to='/login'>
                            <Button size='sm'>Sign in</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* ── Hero Section ─────────────────────────────────── */}
            <section className='relative overflow-hidden'>
                {/* Background effects */}
                <div className='pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden'>
                    <div className='absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl' />
                    <div className='absolute right-0 top-1/4 h-[300px] w-[400px] rounded-full bg-chart-1/5 blur-3xl' />
                    <div className='absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-chart-2/5 blur-3xl' />

                    {/* Radar Animation */}
                    <Radar className='absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-30 sm:h-[800px] sm:w-[800px] md:h-[1000px] md:w-[1000px]' />
                </div>

                <div className='relative mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-36 lg:py-44'>
                    <div className='flex flex-col items-center space-y-8 text-center'>
                        {/* Badge */}
                        <div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm'>
                            <Zap className='h-3.5 w-3.5 text-primary' />
                            Open-source &middot; Self-hosted &middot; GDPR-ready
                        </div>

                        {/* Headline */}
                        <div className='space-y-4'>
                            <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl'>
                                Privacy-first
                                <br />
                                <span className='bg-linear-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent'>
                                    Web Analytics
                                </span>
                            </h1>
                            <p className='mx-auto max-w-[700px] text-lg font-light text-muted-foreground md:text-xl lg:text-2xl'>
                                Simple, lightweight, and GDPR-compliant
                                analytics for your websites. No cookies, no
                                cross-site tracking. Just clear insights.
                            </p>
                        </div>

                        {/* CTA buttons */}
                        <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
                            <Link to='/login'>
                                <Button
                                    size='lg'
                                    className='w-full gap-2 px-8 py-6 text-lg sm:w-auto'
                                >
                                    Get Started
                                    <ArrowRight className='h-4 w-4' />
                                </Button>
                            </Link>
                            <a
                                href='https://github.com/ondrasalek/oslks-telemetry'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                <Button
                                    variant='outline'
                                    size='lg'
                                    className='w-full gap-2 px-8 py-6 text-lg sm:w-auto'
                                >
                                    <Github className='h-5 w-5' />
                                    View Source
                                </Button>
                            </a>
                        </div>

                        {/* Stats bar */}
                        <div className='flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground'>
                            <div className='flex items-center gap-2'>
                                <Lock className='h-4 w-4 text-primary' />
                                Zero cookies
                            </div>
                            <div className='flex items-center gap-2'>
                                <Zap className='h-4 w-4 text-primary' />
                                &lt;1 KB tracker script
                            </div>
                            <div className='flex items-center gap-2'>
                                <Globe className='h-4 w-4 text-primary' />
                                Ad-blocker resilient
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features Section ─────────────────────────────── */}
            <section className='relative border-t border-border/40 bg-muted/20'>
                <div className='mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-32'>
                    <div className='mb-12 text-center md:mb-16'>
                        <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                            Built for what matters
                        </h2>
                        <p className='mt-3 text-muted-foreground md:text-lg'>
                            Everything you need, nothing you don&apos;t.
                        </p>
                    </div>

                    <div className='grid gap-6 md:grid-cols-3 lg:gap-8'>
                        <FeatureCard
                            icon={ShieldCheck}
                            title='Privacy Focused'
                            description="No cookies, no fingerprinting, no cross-site tracking. Fully GDPR compliant by design — your visitors' data stays private."
                        />
                        <FeatureCard
                            icon={Activity}
                            title='Real-time Analytics'
                            description='See visitors as they arrive. Live pageview counts, active visitor tracking, and time-series charts update automatically.'
                        />
                        <FeatureCard
                            icon={Github}
                            title='Open Source'
                            description='Fully open-source under MIT. Self-host on your own infrastructure or deploy with one click. No vendor lock-in, ever.'
                        />
                    </div>
                </div>
            </section>

            {/* ── How it Works Section ─────────────────────────── */}
            <section className='border-t border-border/40'>
                <div className='mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-32'>
                    <div className='mb-12 text-center md:mb-16'>
                        <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                            Up and running in minutes
                        </h2>
                        <p className='mt-3 text-muted-foreground md:text-lg'>
                            Three simple steps to privacy-friendly analytics.
                        </p>
                    </div>

                    <div className='grid gap-8 md:grid-cols-3'>
                        <StepCard
                            step={1}
                            title='Deploy'
                            description='Clone the repo and run docker compose up. Your analytics platform is live.'
                        />
                        <StepCard
                            step={2}
                            title='Add the snippet'
                            description='Drop a single <script> tag into your site. Under 1 KB, loads asynchronously.'
                        />
                        <StepCard
                            step={3}
                            title='See your data'
                            description='Pageviews, visitors, referrers, browsers, countries — all in a beautiful real-time dashboard.'
                        />
                    </div>
                </div>
            </section>

            {/* ── CTA Section ──────────────────────────────────── */}
            <section className='border-t border-border/40 bg-muted/20'>
                <div className='mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28'>
                    <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                        Take back control of your analytics
                    </h2>
                    <p className='mx-auto mt-4 max-w-[600px] text-muted-foreground md:text-lg'>
                        Stop sending your visitors&apos; data to third parties.
                        Self-host OSLKS Radar and own your analytics pipeline.
                    </p>
                    <div className='mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
                        <Link to='/login'>
                            <Button
                                size='lg'
                                className='gap-2 px-8 py-6 text-lg'
                            >
                                Get Started Free
                                <ArrowRight className='h-4 w-4' />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className='border-t border-border/40 bg-background/50 backdrop-blur-sm'>
                <div className='mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row md:px-6'>
                    <div className='flex items-center gap-2'>
                        <img
                            src='/icon.svg'
                            alt='OSLKS Radar'
                            className='h-5 w-5'
                        />
                        <p className='text-sm text-muted-foreground'>
                            © 2026 OSLKS Radar. All rights reserved.
                        </p>
                    </div>
                    <nav className='flex gap-6 sm:ml-auto'>
                        <Link
                            to='/terms'
                            className='text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'
                        >
                            Terms
                        </Link>
                        <Link
                            to='/privacy'
                            className='text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'
                        >
                            Privacy
                        </Link>
                        <a
                            href='https://github.com/ondrasalek/oslks-telemetry'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'
                        >
                            GitHub
                        </a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

// ── Feature Card ─────────────────────────────────────────
function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <Card className='border-primary/10 bg-background/60 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg'>
            <CardHeader>
                <div className='mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                    <Icon className='h-6 w-6' />
                </div>
                <CardTitle className='text-xl'>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className='text-base leading-relaxed'>
                    {description}
                </CardDescription>
            </CardContent>
        </Card>
    );
}

// ── Step Card ────────────────────────────────────────────
function StepCard({
    step,
    title,
    description,
}: {
    step: number;
    title: string;
    description: string;
}) {
    return (
        <div className='flex flex-col items-center text-center'>
            <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground'>
                {step}
            </div>
            <h3 className='mb-2 text-lg font-semibold'>{title}</h3>
            <p className='text-muted-foreground'>{description}</p>
        </div>
    );
}
