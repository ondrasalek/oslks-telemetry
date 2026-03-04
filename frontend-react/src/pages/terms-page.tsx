import { Link } from 'react-router-dom';

export function TermsPage() {
    return (
        <div className='mx-auto max-w-3xl px-6 py-16'>
            <h1 className='text-3xl font-bold tracking-tight mb-8'>
                Terms of Service
            </h1>

            <div className='prose prose-invert max-w-none space-y-6 text-muted-foreground'>
                <p className='text-base leading-relaxed'>
                    Welcome to{' '}
                    <strong className='text-foreground'>OSLKS Radar</strong>. By
                    using this service, you agree to these terms.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    1. Service Description
                </h2>
                <p>
                    OSLKS Radar is a self-hosted web analytics platform that
                    collects anonymous pageview and visitor data for websites
                    you own or manage. The service is provided "as is" without
                    warranty of any kind.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    2. Acceptable Use
                </h2>
                <p>You agree to:</p>
                <ul className='list-disc pl-6 space-y-1'>
                    <li>
                        Only track websites you own or have explicit permission
                        to monitor.
                    </li>
                    <li>
                        Not use the service for any illegal or unauthorized
                        purpose.
                    </li>
                    <li>
                        Not attempt to access other users' data or disrupt the
                        service.
                    </li>
                    <li>Comply with all applicable laws and regulations.</li>
                </ul>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    3. Data Ownership
                </h2>
                <p>
                    You retain full ownership of all analytics data collected
                    through your account. As the instance operator, you are
                    responsible for compliance with data protection laws
                    applicable in your jurisdiction (e.g., GDPR, CCPA).
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    4. Account Responsibilities
                </h2>
                <p>
                    You are responsible for maintaining the security of your
                    account credentials. Notify the instance administrator
                    immediately if you suspect unauthorized access.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    5. Service Availability
                </h2>
                <p>
                    As a self-hosted solution, service availability depends on
                    your infrastructure. The developers make no guarantees
                    regarding uptime or data preservation.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    6. Limitation of Liability
                </h2>
                <p>
                    OSLKS Radar and its developers shall not be liable for any
                    indirect, incidental, or consequential damages arising from
                    the use of this software.
                </p>

                <h2 className='text-xl font-semibold text-foreground mt-8'>
                    7. Changes
                </h2>
                <p>
                    These terms may be updated at any time. Continued use of the
                    service constitutes acceptance of the updated terms.
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
