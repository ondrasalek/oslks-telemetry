import { Link } from 'react-router-dom';

export function NotFoundPage() {
    return (
        <div className='flex min-h-screen items-center justify-center bg-background'>
            <div className='text-center'>
                <h1 className='text-6xl font-bold text-muted-foreground'>
                    404
                </h1>
                <p className='mt-4 text-xl text-muted-foreground'>
                    Page not found
                </p>
                <Link
                    to='/dashboard'
                    className='mt-6 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
