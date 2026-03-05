import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/hooks/use-auth';
import { useInstallCheck } from '@/hooks/use-install';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useLogin();
    const navigate = useNavigate();
    const { data: installStatus } = useInstallCheck();

    useEffect(() => {
        if (installStatus && !installStatus.installed) {
            navigate('/install');
        }
    }, [installStatus, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login.mutate(
            { email, password },
            {
                onSuccess: (data) => {
                    if (data.success) navigate('/dashboard');
                },
            },
        );
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className='w-full max-w-sm'>
                <CardHeader className='text-center'>
                    <div className='mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg'>
                        <img
                            src='/icon.svg'
                            alt='OSLKS Radar'
                            className='h-full w-full object-contain'
                        />
                    </div>
                    <CardTitle>Sign in</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <label
                                htmlFor='email'
                                className='text-sm font-medium text-foreground'
                            >
                                Email
                            </label>
                            <input
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                placeholder='you@example.com'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label
                                htmlFor='password'
                                className='text-sm font-medium text-foreground'
                            >
                                Password
                            </label>
                            <input
                                id='password'
                                type='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                placeholder='••••••••'
                            />
                        </div>

                        {(login.data?.error || login.error) && (
                            <p className='text-sm text-destructive'>
                                {login.data?.error ?? login.error?.message}
                            </p>
                        )}

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={login.isPending}
                        >
                            {login.isPending ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
