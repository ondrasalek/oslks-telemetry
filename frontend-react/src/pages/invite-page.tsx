import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useGetInvite, useAcceptInvite } from '@/hooks/use-teams';
import { useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function InvitePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { data: user, isLoading: userLoading } = useCurrentUser();

    const {
        data: invite,
        isLoading: inviteLoading,
        error: inviteError,
    } = useGetInvite(token || '');
    const acceptInvite = useAcceptInvite(token || '');

    useEffect(() => {
        if (!token) {
            navigate('/dashboard', { replace: true });
        }
    }, [token, navigate]);

    if (inviteLoading || userLoading) {
        return (
            <div className='flex items-center justify-center min-h-[calc(100vh-4rem)]'>
                <Card className='w-full max-w-md'>
                    <CardHeader>
                        <Skeleton className='h-6 w-3/4 mx-auto' />
                        <Skeleton className='h-4 w-1/2 mx-auto mt-2' />
                    </CardHeader>
                    <CardContent className='flex justify-center'>
                        <Skeleton className='h-10 w-full' />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (inviteError || !invite) {
        return (
            <div className='flex items-center justify-center min-h-[calc(100vh-4rem)]'>
                <Card className='w-full max-w-md border-destructive'>
                    <CardHeader>
                        <CardTitle className='text-center text-destructive'>
                            Invalid Invitation
                        </CardTitle>
                        <CardDescription className='text-center'>
                            This invitation link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className='flex justify-center'>
                        <Button
                            variant='outline'
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const handleAccept = () => {
        acceptInvite.mutate(undefined, {
            onSuccess: () => {
                navigate(`/dashboard/teams/${invite.team_id}`);
            },
        });
    };

    return (
        <div className='flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4'>
            <div className='mb-8 text-center'>
                <h1 className='text-3xl font-bold'>OSLKS Radar</h1>
            </div>

            <Card className='w-full max-w-md shadow-lg'>
                <CardHeader>
                    <CardTitle className='text-xl text-center'>
                        Team Invitation
                    </CardTitle>
                    <CardDescription className='text-center text-base mt-2'>
                        You have been invited to join{' '}
                        <strong>{invite.team_name}</strong>
                        {invite.invited_by_name && (
                            <span> by {invite.invited_by_name}</span>
                        )}
                        .
                    </CardDescription>
                </CardHeader>

                <CardContent className='space-y-4'>
                    {user ? (
                        <div className='space-y-4'>
                            {user.email !== invite.email ? (
                                <div className='p-4 text-sm text-destructive bg-destructive/10 rounded-md'>
                                    Caution: You are logged in as {user.email},
                                    but this invite is for {invite.email}.
                                    Please log in with the correct account to
                                    accept.
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    <div className='p-4 text-sm bg-muted rounded-md text-center'>
                                        You will join as an{' '}
                                        <strong>{invite.role}</strong>.
                                    </div>
                                    <Button
                                        className='w-full'
                                        onClick={handleAccept}
                                        disabled={acceptInvite.isPending}
                                    >
                                        {acceptInvite.isPending
                                            ? 'Accepting...'
                                            : 'Accept Invitation'}
                                    </Button>
                                    {acceptInvite.error && (
                                        <p className='text-sm text-destructive text-center'>
                                            {acceptInvite.error.message}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className='space-y-4 pt-2'>
                            <p className='text-sm text-center text-muted-foreground'>
                                Log in or create an account with{' '}
                                <strong>{invite.email}</strong> to join this
                                team.
                            </p>
                            <div className='flex gap-3'>
                                <Button
                                    asChild
                                    variant='outline'
                                    className='flex-1'
                                >
                                    <Link
                                        to={`/login?returnTo=/invite/accept?token=${token}`}
                                    >
                                        Log in
                                    </Link>
                                </Button>
                                <Button asChild className='flex-1'>
                                    <Link
                                        to={`/register?email=${encodeURIComponent(invite.email)}&returnTo=/invite/accept?token=${token}`}
                                    >
                                        Register
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
