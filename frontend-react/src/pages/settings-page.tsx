import { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Code, User, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SettingsPage() {
    const queryClient = useQueryClient();
    const { data: user, isLoading: authLoading } = useCurrentUser();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    const { data: apiKeys, isLoading: keysLoading } = useQuery<any[]>({
        queryKey: ['api-keys'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/api_keys');
            return data;
        },
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (payload: { name: string; email: string }) => {
            await apiClient.put(`/api/users/${user?.id}/profile`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-user'] });
            setIsEditingProfile(false);
        },
    });

    const createKeyMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data } = await apiClient.post('/api/api_keys', { name });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            setGeneratedKey(data.api_key);
            setNewKeyName('');
        },
    });

    const deleteKeyMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/api_keys/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
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

                {/* API Keys Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>
                            Generate tokens for external integrations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {/* New Key Form */}
                        <div className='flex gap-2'>
                            <Input
                                placeholder='Key name (e.g. CLI)'
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                            />
                            <Button
                                size='sm'
                                disabled={
                                    !newKeyName || createKeyMutation.isPending
                                }
                                onClick={() =>
                                    createKeyMutation.mutate(newKeyName)
                                }
                            >
                                {createKeyMutation.isPending ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Plus className='h-4 w-4' />
                                )}
                                <span className='ml-2 hidden sm:inline'>
                                    Create
                                </span>
                            </Button>
                        </div>

                        {generatedKey && (
                            <div className='rounded-md bg-muted p-3'>
                                <p className='mb-1 text-xs font-semibold uppercase text-muted-foreground'>
                                    Your new key (copy it now!):
                                </p>
                                <code className='break-all text-sm font-mono font-bold text-primary'>
                                    {generatedKey}
                                </code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='mt-2 h-auto p-0 text-xs'
                                    onClick={() => setGeneratedKey(null)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}

                        {keysLoading ? (
                            <Skeleton className='h-32 w-full' />
                        ) : apiKeys && apiKeys.length > 0 ? (
                            <div className='space-y-2'>
                                {apiKeys.map((key) => (
                                    <div
                                        key={key.id}
                                        className='flex items-center justify-between rounded-md border border-border p-3'
                                    >
                                        <div>
                                            <p className='text-sm font-medium'>
                                                {key.name}
                                            </p>
                                            <p className='text-xs text-muted-foreground font-mono'>
                                                {key.key.substring(0, 8)}...
                                            </p>
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-8 w-8 text-destructive hover:bg-destructive/10'
                                            onClick={() =>
                                                deleteKeyMutation.mutate(key.id)
                                            }
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='flex flex-col items-center justify-center py-6 border rounded-lg border-dashed'>
                                <Code className='mb-2 h-8 w-8 text-muted-foreground' />
                                <p className='text-sm text-muted-foreground text-center'>
                                    No API keys yet.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
