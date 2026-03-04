import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Protects child routes by verifying a valid session exists.
 *
 * – While the auth check is in-flight → shows a loading skeleton.
 * – If no user is found             → redirects to /login.
 * – Otherwise                        → renders <Outlet />.
 */
export function ProtectedRoute() {
    const { data: user, isLoading, isError } = useCurrentUser();

    if (isLoading) {
        return (
            <div className='flex h-screen w-full items-center justify-center bg-background'>
                <div className='flex flex-col items-center gap-4'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <Skeleton className='h-4 w-32' />
                </div>
            </div>
        );
    }

    if (isError || !user) {
        return <Navigate to='/login' replace />;
    }

    return <Outlet />;
}
