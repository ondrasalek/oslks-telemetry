import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useChangePassword, useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

/** Shown after an admin-issued one-time password; also usable any time while signed in. */
export function ChangePasswordPage() {
    const { data: user, isLoading } = useCurrentUser();
    const changePassword = useChangePassword();
    const navigate = useNavigate();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [mismatch, setMismatch] = useState(false);

    if (isLoading) return null;
    if (!user) return <Navigate to='/login' replace />;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMismatch(next !== confirm);
        if (next !== confirm) return;
        changePassword.mutate(
            { current_password: current, new_password: next },
            { onSuccess: () => navigate('/dashboard') },
        );
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className='w-full max-w-sm'>
                <CardHeader className='text-center'>
                    <CardTitle>Choose a new password</CardTitle>
                    <CardDescription>
                        {user.must_change_password
                            ? 'You signed in with a one-time password. Set your own to continue.'
                            : 'Update the password for your account.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='current'>
                                {user.must_change_password
                                    ? 'One-time password'
                                    : 'Current password'}
                            </Label>
                            <Input
                                id='current'
                                type='password'
                                value={current}
                                onChange={(e) => setCurrent(e.target.value)}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='new'>New password</Label>
                            <Input
                                id='new'
                                type='password'
                                minLength={8}
                                value={next}
                                onChange={(e) => setNext(e.target.value)}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='confirm'>Confirm new password</Label>
                            <Input
                                id='confirm'
                                type='password'
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>

                        {(mismatch || changePassword.error) && (
                            <p className='text-sm text-destructive'>
                                {mismatch
                                    ? 'Passwords do not match'
                                    : changePassword.error?.message}
                            </p>
                        )}

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={changePassword.isPending}
                        >
                            {changePassword.isPending
                                ? 'Saving…'
                                : 'Save password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
