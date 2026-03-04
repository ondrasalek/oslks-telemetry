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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Building2,
    Users,
    MoreVertical,
    Trash2,
    Edit,
    ExternalLink,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState } from 'react';
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

interface AdminTeam {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    member_count: number;
}

export function AdminTeamsPage() {
    const queryClient = useQueryClient();
    const { data: teams, isLoading } = useQuery<AdminTeam[]>({
        queryKey: ['admin-all-teams'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/teams/all');
            return data;
        },
    });

    const deleteTeam = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/teams/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
        },
    });

    const [editTeam, setEditTeam] = useState<AdminTeam | null>(null);
    const [showCreateTeam, setShowCreateTeam] = useState(false);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        All Teams
                    </h1>
                    <p className='text-muted-foreground'>
                        View and manage all teams across the platform.
                    </p>
                </div>
                <Button onClick={() => setShowCreateTeam(true)}>
                    Create Team
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Managed Teams</CardTitle>
                    <CardDescription>
                        {teams?.length ?? 0} teams registered on this instance.
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
                                            <Skeleton className='h-4 w-32' />
                                            <Skeleton className='h-3 w-24' />
                                        </div>
                                    </div>
                                    <Skeleton className='h-6 w-20' />
                                    <Skeleton className='h-4 w-24' />
                                    <Skeleton className='h-8 w-8' />
                                </div>
                            ))}
                        </div>
                    ) : teams && teams.length > 0 ? (
                        <div className='rounded-md border'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b bg-muted/50'>
                                        <th className='p-3 text-left font-medium'>
                                            Team
                                        </th>
                                        <th className='p-3 text-left font-medium'>
                                            Members
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
                                    {teams.map((team) => (
                                        <tr
                                            key={team.id}
                                            className='border-b last:border-0'
                                        >
                                            <td className='p-3'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary'>
                                                        <Building2 className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/dashboard/teams/${team.id}`}
                                                            className='font-medium hover:underline'
                                                        >
                                                            {team.name}
                                                        </Link>
                                                        <p className='text-xs text-muted-foreground'>
                                                            {team.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='p-3'>
                                                <div className='flex items-center gap-1 text-muted-foreground'>
                                                    <Users className='h-4 w-4' />
                                                    {team.member_count}
                                                </div>
                                            </td>
                                            <td className='p-3 text-muted-foreground'>
                                                {format(
                                                    parseISO(team.created_at),
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
                                                                to={`/dashboard/teams/${team.id}`}
                                                                className='gap-2'
                                                            >
                                                                <ExternalLink className='h-4 w-4' />
                                                                View Team
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setEditTeam(
                                                                    team,
                                                                )
                                                            }
                                                            className='gap-2'
                                                        >
                                                            <Edit className='h-4 w-4' />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (
                                                                    confirm(
                                                                        `Delete team "${team.name}"? All team websites will be unassigned.`,
                                                                    )
                                                                ) {
                                                                    deleteTeam.mutate(
                                                                        team.id,
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
                            No teams found.
                        </p>
                    )}
                </CardContent>
            </Card>

            {editTeam && (
                <EditTeamModal
                    team={editTeam}
                    onClose={() => setEditTeam(null)}
                />
            )}

            {showCreateTeam && (
                <CreateTeamModal onClose={() => setShowCreateTeam(false)} />
            )}
        </div>
    );
}

function EditTeamModal({
    team,
    onClose,
}: {
    team: AdminTeam;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(team.name);
    const [slug, setSlug] = useState(team.slug);

    const updateTeam = useMutation({
        mutationFn: async (payload: { name: string; slug: string }) => {
            await apiClient.put(`/api/teams/${team.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTeam.mutate({ name, slug });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Team</DialogTitle>
                    <DialogDescription>
                        Update team name and slug.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='team-name'>Team Name</Label>
                        <Input
                            id='team-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='team-slug'>Slug</Label>
                        <Input
                            id='team-slug'
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            required
                        />
                    </div>
                    {updateTeam.error && (
                        <p className='text-sm text-destructive'>
                            {(updateTeam.error as Error).message}
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
                        <Button type='submit' disabled={updateTeam.isPending}>
                            {updateTeam.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CreateTeamModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');

    const createTeam = useMutation({
        mutationFn: async (payload: { name: string }) => {
            await apiClient.post('/api/teams', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createTeam.mutate({ name });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Team</DialogTitle>
                    <DialogDescription>
                        Create a new team. You will be assigned as its owner.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='new-team-name'>Team Name</Label>
                        <Input
                            id='new-team-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    {createTeam.error && (
                        <p className='text-sm text-destructive'>
                            {(createTeam.error as Error).message}
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
                        <Button type='submit' disabled={createTeam.isPending}>
                            {createTeam.isPending
                                ? 'Creating...'
                                : 'Create Team'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
