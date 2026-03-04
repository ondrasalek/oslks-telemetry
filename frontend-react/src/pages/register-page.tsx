import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useRegister } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const register = useRegister();

    const [name, setName] = useState('');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');

    const returnTo = searchParams.get('returnTo');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        register.mutate(
            { name, email, password },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        navigate(returnTo || '/dashboard');
                    }
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
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                        Join OSLKS Radar to start tracking your analytics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='name'>Full Name</Label>
                            <Input
                                id='name'
                                type='text'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder='John Doe'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='email'>Email Address</Label>
                            <Input
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder='you@example.com'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='password'>Password</Label>
                            <Input
                                id='password'
                                type='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder='••••••••'
                            />
                        </div>

                        {register.data?.error && (
                            <p className='text-sm text-destructive'>
                                {register.data.error}
                            </p>
                        )}

                        <Button
                            type='submit'
                            className='w-full'
                            disabled={register.isPending}
                        >
                            {register.isPending
                                ? 'Creating account...'
                                : 'Create account'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className='flex justify-center border-t p-4'>
                    <p className='text-sm text-muted-foreground'>
                        Already have an account?{' '}
                        <Link
                            to='/login'
                            className='text-primary hover:underline'
                        >
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
