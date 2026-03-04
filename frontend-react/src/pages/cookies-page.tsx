import { Link } from 'react-router-dom';

export function CookiesPage() {
    return (
        <div className='mx-auto max-w-3xl px-6 py-16'>
            <h1 className='text-3xl font-bold tracking-tight mb-8'>
                Cookie Policy
            </h1>

            <div className='prose prose-invert max-w-none space-y-6 text-muted-foreground'>
                <p className='text-base leading-relaxed'>
                    This policy explains how{' '}
                    <strong className='text-foreground'>OSLKS Radar</strong>{' '}
                    uses cookies and similar technologies on this website.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    1. What Are Cookies?
                </h2>
                <p>
                    Cookies are small text files stored on your device when you
                    visit a website. They help the site remember your
                    preferences and improve your browsing experience.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    2. Essential Cookies
                </h2>
                <p>
                    These cookies are strictly necessary for the website to
                    function and cannot be disabled. They include:
                </p>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>
                        <strong className='text-foreground'>
                            Session cookie
                        </strong>{' '}
                        — maintains your login state while using the dashboard.
                    </li>
                    <li>
                        <strong className='text-foreground'>
                            Cookie consent preference
                        </strong>{' '}
                        — remembers your cookie choice so we don't ask again
                        (stored in localStorage).
                    </li>
                </ul>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    3. Analytics Cookies
                </h2>
                <p>
                    If you consent, we use privacy-friendly analytics (OSLKS
                    Telemetry) to understand how visitors use this website.
                    These tools:
                </p>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>Do not collect personally identifiable information.</li>
                    <li>Do not track you across websites.</li>
                    <li>Do not use fingerprinting.</li>
                    <li>
                        Collect only anonymous pageview data (page URL,
                        referrer, browser, country, device type).
                    </li>
                </ul>
                <p>
                    You can enable or disable analytics cookies at any time via
                    the cookie banner or by clearing your browser's local
                    storage.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    4. Third-Party Cookies
                </h2>
                <p>
                    OSLKS Radar does not use any third-party advertising or
                    marketing cookies. No data is shared with external
                    advertisers or data brokers.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    5. Managing Cookies
                </h2>
                <p>
                    You can control cookies through your browser settings. Most
                    browsers allow you to:
                </p>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>View and delete existing cookies.</li>
                    <li>Block all or specific cookies.</li>
                    <li>Set preferences for certain websites.</li>
                </ul>
                <p>
                    Note that blocking essential cookies may prevent parts of
                    the dashboard from working correctly.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    6. Changes
                </h2>
                <p>
                    This cookie policy may be updated as the software evolves.
                    Check this page periodically for changes.
                </p>

                <div className='pt-8 border-t border-border flex gap-4'>
                    <Link
                        to='/'
                        className='text-primary hover:underline text-sm'
                    >
                        ← Back to Home
                    </Link>
                    <Link
                        to='/privacy'
                        className='text-primary hover:underline text-sm'
                    >
                        Privacy Policy
                    </Link>
                    <Link
                        to='/terms'
                        className='text-primary hover:underline text-sm'
                    >
                        Terms of Service
                    </Link>
                </div>
            </div>
        </div>
    );
}
