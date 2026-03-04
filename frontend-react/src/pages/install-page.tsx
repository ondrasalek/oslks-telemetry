import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstallCheck } from '@/hooks/use-install';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

export function InstallPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: installStatus } = useInstallCheck();

    useEffect(() => {
        if (installStatus && installStatus.installed) {
            navigate('/login');
        }
    }, [installStatus, navigate]);

    const installMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { data } = await apiClient.post(
                '/api/install/setup',
                payload,
            );
            if (!data.success) {
                throw new Error(data.error || 'Failed to install');
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['install-check'] });
            navigate('/login');
        },
        onError: (err: Error) => {
            setErrorMsg(err.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setErrorMsg('Password must be at least 8 characters');
            return;
        }
        installMutation.mutate({ name, email, password });
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className='w-full max-w-lg'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-2xl'>
                        Installation Wizard
                    </CardTitle>
                    <CardDescription>
                        Set up your OSLKS Radar instance. Create the first
                        superuser account and configure your analytics platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <label
                                htmlFor='name'
                                className='text-sm font-medium text-foreground'
                            >
                                Full Name
                            </label>
                            <input
                                id='name'
                                type='text'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                placeholder='John Doe'
                            />
                        </div>

                        <div className='space-y-2'>
                            <label
                                htmlFor='email'
                                className='text-sm font-medium text-foreground'
                            >
                                Admin Email
                            </label>
                            <input
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                placeholder='admin@example.com'
                            />
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
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
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                    placeholder='••••••••'
                                />
                            </div>
                            <div className='space-y-2'>
                                <label
                                    htmlFor='confirmPassword'
                                    className='text-sm font-medium text-foreground'
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id='confirmPassword'
                                    type='password'
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    required
                                    className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                    placeholder='••••••••'
                                />
                            </div>
                        </div>

                        {errorMsg && (
                            <p className='text-sm text-destructive text-center'>
                                {errorMsg}
                            </p>
                        )}

                        <Button
                            type='submit'
                            className='w-full mt-4'
                            disabled={installMutation.isPending}
                        >
                            {installMutation.isPending
                                ? 'Installing...'
                                : 'Complete Installation'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
