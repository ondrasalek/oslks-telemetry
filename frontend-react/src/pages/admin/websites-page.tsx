import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, MoreVertical, Trash2, ExternalLink, Pin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminWebsite {
    id: string;
    domain: string;
    name: string | null;
    team_id: string | null;
    team_name: string | null;
    status: string;
    share_id: string | null;
    is_pinned: boolean;
    created_at: string;
}

export function AdminWebsitesPage() {
    const queryClient = useQueryClient();
    const { data: websites, isLoading } = useQuery<AdminWebsite[]>({
        queryKey: ['admin-all-websites'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/websites/all');
            return data;
        },
    });

    const deleteWebsite = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/websites/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-websites'] });
        },
    });

    const [showCreateWebsite, setShowCreateWebsite] = useState(false);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        All Websites
                    </h1>
                    <p className='text-muted-foreground'>
                        View and manage every website across all teams.
                    </p>
                </div>
                <Button onClick={() => setShowCreateWebsite(true)}>
                    Create Website
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Managed Websites</CardTitle>
                    <CardDescription>
                        {websites?.length ?? 0} websites registered across all
                        teams.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className='space-y-4'>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className='flex items-center justify-between border-b pb-4'
                                >
                                    <div className='flex items-center gap-2'>
                                        <Skeleton className='h-8 w-8 rounded' />
                                        <div className='space-y-1'>
                                            <Skeleton className='h-4 w-40' />
                                            <Skeleton className='h-3 w-28' />
                                        </div>
                                    </div>
                                    <Skeleton className='h-6 w-20' />
                                    <Skeleton className='h-4 w-24' />
                                    <Skeleton className='h-8 w-8' />
                                </div>
                            ))}
                        </div>
                    ) : websites && websites.length > 0 ? (
                        <div className='rounded-md border'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b bg-muted/50'>
                                        <th className='p-3 text-left font-medium'>
                                            Website
                                        </th>
                                        <th className='p-3 text-left font-medium'>
                                            Team
                                        </th>
                                        <th className='p-3 text-left font-medium'>
                                            Status
                                        </th>
                                        <th className='p-3 text-left font-medium'>
                                            Created
                                        </th>
                                        <th className='p-3 text-right font-medium'>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {websites.map((site) => (
                                        <tr
                                            key={site.id}
                                            className='border-b last:border-0'
                                        >
                                            <td className='p-3'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary'>
                                                        <Globe className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/dashboard/sites/${site.id}`}
                                                            className='font-medium hover:underline'
                                                        >
                                                            {site.name ||
                                                                site.domain}
                                                        </Link>
                                                        <p className='text-xs text-muted-foreground'>
                                                            {site.domain}
                                                        </p>
                                                    </div>
                                                    {site.is_pinned && (
                                                        <Pin className='h-3 w-3 text-yellow-500' />
                                                    )}
                                                </div>
                                            </td>
                                            <td className='p-3 text-muted-foreground'>
                                                {site.team_name ?? '—'}
                                            </td>
                                            <td className='p-3'>
                                                <Badge
                                                    variant={
                                                        site.status === 'active'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                >
                                                    {site.status}
                                                </Badge>
                                                {site.share_id && (
                                                    <Badge
                                                        variant='outline'
                                                        className='ml-1'
                                                    >
                                                        shared
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className='p-3 text-muted-foreground'>
                                                {format(
                                                    parseISO(site.created_at),
                                                    'MMM d, yyyy',
                                                )}
                                            </td>
                                            <td className='p-3 text-right'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant='ghost'
                                                            size='icon'
                                                            className='h-8 w-8'
                                                        >
                                                            <MoreVertical className='h-4 w-4' />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align='end'>
                                                        <DropdownMenuItem
                                                            asChild
                                                        >
                                                            <Link
                                                                to={`/dashboard/sites/${site.id}`}
                                                                className='gap-2'
                                                            >
                                                                <ExternalLink className='h-4 w-4' />
                                                                View Analytics
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (
                                                                    confirm(
                                                                        `Delete website ${site.domain}? This will also remove all analytics data.`,
                                                                    )
                                                                ) {
                                                                    deleteWebsite.mutate(
                                                                        site.id,
                                                                    );
                                                                }
                                                            }}
                                                            className='gap-2 text-destructive focus:text-destructive'
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className='py-8 text-center text-muted-foreground'>
                            No websites found.
                        </p>
                    )}
                </CardContent>
            </Card>

            {showCreateWebsite && (
                <CreateWebsiteModal
                    onClose={() => setShowCreateWebsite(false)}
                />
            )}
        </div>
    );
}

function CreateWebsiteModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [domain, setDomain] = useState('');
    const [name, setName] = useState('');

    const createWebsite = useMutation({
        mutationFn: async (payload: { domain: string; name?: string }) => {
            await apiClient.post('/api/websites', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-websites'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createWebsite.mutate({ domain, name: name || undefined });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Website</DialogTitle>
                    <DialogDescription>
                        Create a new unassigned website tracking property.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='new-website-domain'>
                            Domain (required)
                        </Label>
                        <Input
                            id='new-website-domain'
                            placeholder='example.com'
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='new-website-name'>
                            Name (optional)
                        </Label>
                        <Input
                            id='new-website-name'
                            placeholder='My Website'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    {createWebsite.error && (
                        <p className='text-sm text-destructive'>
                            {(createWebsite.error as Error).message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            disabled={createWebsite.isPending}
                        >
                            {createWebsite.isPending
                                ? 'Creating...'
                                : 'Create Website'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
