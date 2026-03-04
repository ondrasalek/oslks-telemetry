import { useState, useEffect } from 'react';
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
import {
    Code,
    User,
    Loader2,
    Plus,
    Trash2,
    Mail,
    Send,
    Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SettingsPage() {
    const queryClient = useQueryClient();
    const { data: user, isLoading: authLoading } = useCurrentUser();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    // General Settings
    const [appUrl, setAppUrl] = useState('');
    const [generalSaveResult, setGeneralSaveResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    // SMTP state (superuser only)
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');
    const [smtpFrom, setSmtpFrom] = useState('');
    const [smtpFromName, setSmtpFromName] = useState('');
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [saveResult, setSaveResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const { data: apiKeys, isLoading: keysLoading } = useQuery<any[]>({
        queryKey: ['api-keys'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/api_keys');
            return data;
        },
    });

    // Load SMTP settings for superuser
    const { data: generalData, isLoading: generalLoading } = useQuery({
        queryKey: ['settings', 'general'],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                success: boolean;
                setting?: { value: any };
            }>('/api/settings/general');
            return data;
        },
        enabled: user?.role === 'superuser',
    });

    const { data: smtpData, isLoading: smtpLoading } = useQuery({
        queryKey: ['settings', 'smtp'],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                success: boolean;
                setting?: { value: any };
            }>('/api/settings/smtp');
            return data;
        },
        enabled: user?.role === 'superuser',
    });

    useEffect(() => {
        if (generalData?.success && generalData.setting?.value) {
            setAppUrl(generalData.setting.value.app_url || '');
        }
    }, [generalData]);

    // Populate SMTP state when data is loaded
    useEffect(() => {
        if (smtpData?.success && smtpData.setting?.value) {
            const v = smtpData.setting.value;
            setSmtpHost(v.host || '');
            setSmtpPort(String(v.port || 587));
            setSmtpUser(v.username || '');
            setSmtpPass(v.password || '');
            setSmtpFrom(v.from_email || '');
            setSmtpFromName(v.from_name || '');
        }
    }, [smtpData]);

    const generalMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { data } = await apiClient.post('/api/settings/general', {
                value: payload,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['settings', 'general'],
            });
            setGeneralSaveResult({
                success: true,
                message: 'General settings saved successfully!',
            });
            setTimeout(() => setGeneralSaveResult(null), 5000);
        },
        onError: (err: Error) => {
            setGeneralSaveResult({
                success: false,
                message: err.message || 'Failed to save settings',
            });
        },
    });

    const smtpMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { data } = await apiClient.post('/api/settings/smtp', {
                value: payload,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'smtp'] });
            setSaveResult({
                success: true,
                message: 'SMTP settings saved successfully!',
            });
            setTestResult(null);
            // Hide message after 5 seconds
            setTimeout(() => setSaveResult(null), 5000);
        },
        onError: (err: Error) => {
            setSaveResult({
                success: false,
                message: err.message || 'Failed to save settings',
            });
        },
    });

    const testEmailMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post<{
                success: boolean;
                error?: string;
            }>('/api/settings/test-email');
            return data;
        },
        onSuccess: (data) => {
            setTestResult({
                success: data.success,
                message: data.success
                    ? 'Test email sent successfully!'
                    : data.error || 'Failed',
            });
        },
        onError: (err: Error) => {
            setTestResult({ success: false, message: err.message });
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
                <h1 className='text-2xl font-bold tracking-tight'>Settings</h1>
                <p className='text-muted-foreground'>
                    Manage your account and preferences.
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

            {/* General Settings — superuser only */}
            {user?.role === 'superuser' && (
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Globe className='h-5 w-5' />
                            General Settings
                        </CardTitle>
                        <CardDescription>
                            Configure core application parameters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {generalLoading ? (
                            <Skeleton className='h-24 w-full' />
                        ) : (
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='app-url'>
                                        Application URL (Site URL)
                                    </Label>
                                    <Input
                                        id='app-url'
                                        placeholder='https://radar.example.com'
                                        value={appUrl}
                                        onChange={(e) =>
                                            setAppUrl(e.target.value)
                                        }
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        Used for generating invitation links and
                                        URLs in emails.
                                    </p>
                                </div>

                                {generalSaveResult && (
                                    <div
                                        className={`rounded-md p-3 text-sm ${generalSaveResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}
                                    >
                                        {generalSaveResult.message}
                                    </div>
                                )}

                                <Button
                                    disabled={generalMutation.isPending}
                                    onClick={() => {
                                        generalMutation.mutate({
                                            app_url: appUrl,
                                        });
                                    }}
                                >
                                    {generalMutation.isPending && (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    )}
                                    Save General Settings
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* SMTP Settings — superuser only */}
            {user?.role === 'superuser' && (
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Mail className='h-5 w-5' />
                            SMTP / Email Notifications
                        </CardTitle>
                        <CardDescription>
                            Configure outgoing email for alerts and
                            notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {smtpLoading ? (
                            <Skeleton className='h-40 w-full' />
                        ) : (
                            <div className='space-y-4'>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-host'>
                                            SMTP Host
                                        </Label>
                                        <Input
                                            id='smtp-host'
                                            placeholder='smtp.example.com'
                                            value={smtpHost}
                                            onChange={(e) =>
                                                setSmtpHost(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-port'>Port</Label>
                                        <Input
                                            id='smtp-port'
                                            type='number'
                                            placeholder='587'
                                            value={smtpPort}
                                            onChange={(e) =>
                                                setSmtpPort(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-user'>
                                            Username
                                        </Label>
                                        <Input
                                            id='smtp-user'
                                            placeholder='user@example.com'
                                            value={smtpUser}
                                            onChange={(e) =>
                                                setSmtpUser(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-pass'>
                                            Password
                                        </Label>
                                        <Input
                                            id='smtp-pass'
                                            type='password'
                                            placeholder='••••••••'
                                            value={smtpPass}
                                            onChange={(e) =>
                                                setSmtpPass(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-from'>
                                            From Email
                                        </Label>
                                        <Input
                                            id='smtp-from'
                                            type='email'
                                            placeholder='noreply@example.com'
                                            value={smtpFrom}
                                            onChange={(e) =>
                                                setSmtpFrom(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label htmlFor='smtp-from-name'>
                                            From Name
                                        </Label>
                                        <Input
                                            id='smtp-from-name'
                                            placeholder='OSLKS Telemetry'
                                            value={smtpFromName}
                                            onChange={(e) =>
                                                setSmtpFromName(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                {saveResult && (
                                    <div
                                        className={`rounded-md p-3 text-sm ${saveResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}
                                    >
                                        {saveResult.message}
                                    </div>
                                )}

                                {testResult && (
                                    <div
                                        className={`rounded-md p-3 text-sm ${testResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}
                                    >
                                        {testResult.message}
                                    </div>
                                )}

                                <div className='flex gap-2'>
                                    <Button
                                        disabled={smtpMutation.isPending}
                                        onClick={() => {
                                            setSaveResult(null);
                                            smtpMutation.mutate({
                                                host: smtpHost,
                                                port: parseInt(smtpPort) || 587,
                                                username: smtpUser,
                                                password: smtpPass,
                                                from_email: smtpFrom,
                                                from_name: smtpFromName,
                                            });
                                        }}
                                    >
                                        {smtpMutation.isPending && (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        )}
                                        Save SMTP Settings
                                    </Button>
                                    <Button
                                        variant='outline'
                                        disabled={
                                            testEmailMutation.isPending ||
                                            !smtpHost
                                        }
                                        onClick={() => {
                                            setTestResult(null);
                                            testEmailMutation.mutate();
                                        }}
                                    >
                                        {testEmailMutation.isPending ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Send className='mr-2 h-4 w-4' />
                                        )}
                                        Send Test Email
                                    </Button>
                                </div>

                                {smtpMutation.error && (
                                    <p className='text-sm text-destructive'>
                                        {(smtpMutation.error as Error).message}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
