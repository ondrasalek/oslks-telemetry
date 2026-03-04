import { Link } from 'react-router-dom';

export function PrivacyPage() {
    return (
        <div className='mx-auto max-w-3xl px-6 py-16'>
            <h1 className='text-3xl font-bold tracking-tight mb-8'>
                Privacy Policy
            </h1>

            <div className='prose prose-invert max-w-none space-y-6 text-muted-foreground'>
                <p className='text-base leading-relaxed'>
                    <strong className='text-foreground'>OSLKS Radar</strong> is
                    built with privacy as a core principle. This policy explains
                    what data we collect and how it is handled.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    1. Data We Collect
                </h2>
                <p>When visitors browse a tracked website, we collect:</p>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>
                        <strong className='text-foreground'>Page URL</strong> —
                        the page being viewed
                    </li>
                    <li>
                        <strong className='text-foreground'>Referrer</strong> —
                        where the visitor came from
                    </li>
                    <li>
                        <strong className='text-foreground'>
                            Browser &amp; OS
                        </strong>{' '}
                        — derived from the User-Agent header
                    </li>
                    <li>
                        <strong className='text-foreground'>Country</strong> —
                        derived from IP address (IP is never stored)
                    </li>
                    <li>
                        <strong className='text-foreground'>Device type</strong>{' '}
                        — desktop, tablet, or mobile
                    </li>
                    <li>
                        <strong className='text-foreground'>Session ID</strong>{' '}
                        — a random, non-personal identifier
                    </li>
                </ul>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    2. Data We Do NOT Collect
                </h2>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>No personally identifiable information (PII)</li>
                    <li>No cookies or local storage tracking</li>
                    <li>No IP addresses stored</li>
                    <li>No cross-site or cross-device tracking</li>
                    <li>No fingerprinting</li>
                </ul>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    3. Cookie-Free Analytics
                </h2>
                <p>
                    OSLKS Radar does not use cookies. Session identification is
                    generated server-side using a hash of the visitor's IP
                    address, User-Agent, and a daily rotating salt. The IP
                    address is never stored in the database.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    4. Data Storage
                </h2>
                <p>
                    All analytics data is stored in a PostgreSQL/TimescaleDB
                    database on infrastructure controlled by the instance
                    operator. No data is transmitted to third parties.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    5. Data Retention
                </h2>
                <p>
                    Data retention is managed by the instance operator. Website
                    owners can delete all analytics data for their websites at
                    any time through the dashboard.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    6. GDPR Compliance
                </h2>
                <p>
                    Because OSLKS Radar does not collect personal data, use
                    cookies, or track individuals, it is designed to be
                    compliant with GDPR and similar privacy regulations without
                    requiring a cookie consent banner.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    7. User Accounts
                </h2>
                <p>
                    For dashboard users (website owners), we store an email
                    address and hashed password. This data can be deleted by
                    contacting the instance administrator or deleting the
                    account.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    8. Changes
                </h2>
                <p>
                    This privacy policy may be updated as the software evolves.
                    Check this page periodically for changes.
                </p>

                <div className='pt-8 border-t border-border'>
                    <Link
                        to='/'
                        className='text-primary hover:underline text-sm'
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
