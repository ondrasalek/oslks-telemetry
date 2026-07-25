import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Code, Copy, Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
    useApiKeys,
    useCreateApiKey,
    useRevokeApiKey,
} from '@/hooks/use-api-keys';
import { useTeams } from '@/hooks/use-teams';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (value: string | null) =>
    value ? format(parseISO(value), 'd MMM yyyy') : 'Never';

export function ApiKeysCard() {
    const { data: keys, isLoading } = useApiKeys();
    const { data: teams } = useTeams();
    const createKey = useCreateApiKey();
    const revokeKey = useRevokeApiKey();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    // Held in memory only — the server never returns the secret again.
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createKey.mutate(
            { name, team_id: teamId || undefined },
            {
                onSuccess: (data) => {
                    setIsCreateOpen(false);
                    setName('');
                    setTeamId('');
                    setCopied(false);
                    setNewSecret(data.key);
                },
            },
        );
    };

    const handleCopy = async () => {
        if (!newSecret) return;
        try {
            await navigator.clipboard.writeText(newSecret);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const handleRevoke = (id: string, keyName: string) => {
        if (
            confirm(
                `Revoke "${keyName}"? Any service using this key will immediately stop working.`,
            )
        ) {
            revokeKey.mutate(id);
        }
    };

    return (
        <Card>
            <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
                <div className='space-y-1.5'>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                        Let external services call the API without a browser
                        session, using{' '}
                        <code className='font-mono text-xs'>
                            Authorization: Bearer &lt;key&gt;
                        </code>
                        .
                    </CardDescription>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size='sm' className='gap-2 shrink-0'>
                            <Plus className='h-4 w-4' />
                            New key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                The key acts on your behalf and is limited to a
                                single team.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='key-name'>Name (required)</Label>
                                <Input
                                    id='key-name'
                                    placeholder='CMS integration'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            {teams && teams.length > 1 && (
                                <div className='space-y-2'>
                                    <Label htmlFor='key-team'>Team</Label>
                                    <Select
                                        value={teamId}
                                        onValueChange={setTeamId}
                                    >
                                        <SelectTrigger
                                            id='key-team'
                                            className='w-full'
                                        >
                                            <SelectValue placeholder='Your primary team' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem
                                                    key={team.id}
                                                    value={team.id}
                                                >
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {createKey.error && (
                                <p className='text-sm text-destructive'>
                                    Could not create the key. Please try again.
                                </p>
                            )}
                            <Button
                                type='submit'
                                className='w-full'
                                disabled={!name.trim() || createKey.isPending}
                            >
                                {createKey.isPending && (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                )}
                                Create key
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className='space-y-2'>
                        <Skeleton className='h-16 w-full' />
                        <Skeleton className='h-16 w-full' />
                    </div>
                ) : keys && keys.length > 0 ? (
                    <div className='space-y-2'>
                        {keys.map((key) => (
                            <div
                                key={key.id}
                                className='flex items-center justify-between gap-4 rounded-md border border-border p-3'
                            >
                                <div className='min-w-0 space-y-1'>
                                    <div className='flex items-center gap-2'>
                                        <p className='truncate text-sm font-medium'>
                                            {key.name}
                                        </p>
                                        {key.team_name && (
                                            <Badge variant='outline'>
                                                {key.team_name}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className='font-mono text-xs text-muted-foreground'>
                                        oslks_{key.key_prefix}_••••••••
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                        Created {formatDate(key.created_at)} ·
                                        Last used {formatDate(key.last_used_at)}
                                    </p>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    aria-label={`Revoke ${key.name}`}
                                    className='h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10'
                                    disabled={revokeKey.isPending}
                                    onClick={() =>
                                        handleRevoke(key.id, key.name)
                                    }
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-6'>
                        <Code className='mb-2 h-8 w-8 text-muted-foreground' />
                        <p className='text-center text-sm text-muted-foreground'>
                            No API keys yet.
                        </p>
                    </div>
                )}
            </CardContent>

            {/* One-time secret reveal */}
            <Dialog
                open={!!newSecret}
                onOpenChange={(open) => !open && setNewSecret(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy your new API key</DialogTitle>
                        <DialogDescription>
                            This is the only time the key is shown. Store it
                            somewhere safe before closing this dialog.
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-3'>
                        <code className='block break-all rounded-md bg-muted p-3 font-mono text-sm'>
                            {newSecret}
                        </code>
                        <p className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <TriangleAlert className='h-3.5 w-3.5 shrink-0' />
                            Only a hash is stored — it cannot be recovered
                            later.
                        </p>
                    </div>
                    <DialogFooter className='gap-2 sm:gap-2'>
                        <Button
                            variant='outline'
                            className='gap-2'
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className='h-4 w-4' />
                            ) : (
                                <Copy className='h-4 w-4' />
                            )}
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button onClick={() => setNewSecret(null)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
