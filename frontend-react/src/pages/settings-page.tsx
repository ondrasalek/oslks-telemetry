import { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ApiKeysCard } from '@/components/settings/api-keys-card';

export function SettingsPage() {
    const queryClient = useQueryClient();
    const { data: user, isLoading: authLoading } = useCurrentUser();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');

    const updateProfileMutation = useMutation({
        mutationFn: async (payload: { name: string; email: string }) => {
            await apiClient.put(`/api/users/${user?.id}/profile`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-user'] });
            setIsEditingProfile(false);
        },
    });

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-bold tracking-tight'>
                    Profile Settings
                </h1>
                <p className='text-muted-foreground'>
                    Manage your account and API preferences.
                </p>
            </div>

            <div className='grid gap-6 lg:grid-cols-2'>
                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                            Update your personal information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {authLoading ? (
                            <Skeleton className='h-32 w-full' />
                        ) : user ? (
                            isEditingProfile ? (
                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label htmlFor='name'>Name</Label>
                                        <Input
                                            id='name'
                                            value={profileName}
                                            onChange={(e) =>
                                                setProfileName(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='email'>Email</Label>
                                        <Input
                                            id='email'
                                            type='email'
                                            value={profileEmail}
                                            onChange={(e) =>
                                                setProfileEmail(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            size='sm'
                                            disabled={
                                                updateProfileMutation.isPending
                                            }
                                            onClick={() =>
                                                updateProfileMutation.mutate({
                                                    name: profileName,
                                                    email: profileEmail,
                                                })
                                            }
                                        >
                                            {updateProfileMutation.isPending && (
                                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                            )}
                                            Save Changes
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() =>
                                                setIsEditingProfile(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className='flex items-center gap-4'>
                                    <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
                                        <User className='h-8 w-8 text-muted-foreground' />
                                    </div>
                                    <div className='flex-1'>
                                        <p className='text-lg font-medium'>
                                            {user.name || 'Set your name'}
                                        </p>
                                        <p className='text-sm text-muted-foreground'>
                                            {user.email}
                                        </p>
                                        <Badge
                                            variant='outline'
                                            className='mt-1 uppercase'
                                        >
                                            {user.role}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => {
                                            setProfileName(user.name || '');
                                            setProfileEmail(user.email);
                                            setIsEditingProfile(true);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            )
                        ) : (
                            <p>Not signed in.</p>
                        )}
                    </CardContent>
                </Card>

                <ApiKeysCard />
            </div>
        </div>
    );
}
