import {
    useTeams,
    useCreateTeam,
    useDeleteTeam,
    useUpdateTeam,
} from '@/hooks/use-teams';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { Team } from '@/types/api';

export function TeamsPage() {
    const { data: teams, isLoading } = useTeams();
    const createTeam = useCreateTeam();
    const deleteTeam = useDeleteTeam();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState('');

    const [editTeam, setEditTeam] = useState<Team | null>(null);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createTeam.mutate(
            { name },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setName('');
                },
            },
        );
    };

    const handleDelete = (id: string, name: string) => {
        if (
            confirm(
                `Are you sure you want to delete team "${name}"? This will delete all members and associations.`,
            )
        ) {
            deleteTeam.mutate(id);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>Teams</h1>
                    <p className='text-muted-foreground'>Manage your teams.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size='sm' className='gap-2'>
                            <Plus className='h-4 w-4' />
                            Create team
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Team</DialogTitle>
                            <DialogDescription>
                                Track analytics collaboratively with others.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleCreateSubmit}
                            className='space-y-4'
                        >
                            <div className='space-y-2'>
                                <Label htmlFor='name'>
                                    Team Name (required)
                                </Label>
                                <Input
                                    id='name'
                                    placeholder='Acme Corp'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            {createTeam.error && (
                                <p className='text-sm text-destructive'>
                                    {createTeam.error.message}
                                </p>
                            )}
                            <Button
                                type='submit'
                                className='w-full'
                                disabled={createTeam.isPending}
                            >
                                {createTeam.isPending
                                    ? 'Creating...'
                                    : 'Create Team'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className='space-y-3'>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className='flex items-center gap-3 p-4'>
                                <Skeleton className='h-10 w-10 rounded-lg shrink-0' />
                                <div className='flex-1 min-w-0 pr-10 space-y-2'>
                                    <Skeleton className='h-5 w-32' />
                                    <Skeleton className='h-4 w-48' />
                                </div>
                                <div className='absolute right-4'>
                                    <Skeleton className='h-8 w-8 rounded-md' />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : teams && teams.length > 0 ? (
                <div className='space-y-3'>
                    {teams.map((team) => (
                        <div key={team.id} className='relative group'>
                            <Link to={`/dashboard/teams/${team.id}`}>
                                <Card className='transition-colors hover:border-primary/50'>
                                    <CardContent className='flex items-center gap-3 p-4'>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-muted'>
                                            <Building2 className='h-5 w-5 text-muted-foreground' />
                                        </div>
                                        <div className='flex-1 min-w-0 pr-10'>
                                            <p className='font-medium truncate'>
                                                {team.name}
                                            </p>
                                            <p className='text-sm text-muted-foreground truncate'>
                                                {team.slug}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <div className='absolute top-1/2 -translate-y-1/2 right-4'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
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
                                            onClick={() => setEditTeam(team)}
                                            className='gap-2'
                                        >
                                            <Edit className='h-4 w-4' />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleDelete(team.id, team.name)
                                            }
                                            className='gap-2 text-destructive focus:text-destructive'
                                        >
                                            <Trash2 className='h-4 w-4' />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className='flex flex-col items-center justify-center py-12'>
                        <Building2 className='mb-4 h-12 w-12 text-muted-foreground/50' />
                        <p className='text-muted-foreground'>No teams yet.</p>
                    </CardContent>
                </Card>
            )}

            {editTeam && (
                <EditTeamModal
                    team={editTeam}
                    onClose={() => setEditTeam(null)}
                />
            )}
        </div>
    );
}

function EditTeamModal({ team, onClose }: { team: Team; onClose: () => void }) {
    const updateTeam = useUpdateTeam();
    const [name, setName] = useState(team.name);
    const [slug, setSlug] = useState(team.slug);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTeam.mutate(
            { id: team.id, name, slug },
            {
                onSuccess: () => {
                    onClose();
                },
            },
        );
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Team</DialogTitle>
                    <DialogDescription>
                        Update name or slug for this team.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-name'>Team Name</Label>
                        <Input
                            id='edit-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-slug'>Slug</Label>
                        <Input
                            id='edit-slug'
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            required
                        />
                    </div>
                    {updateTeam.error && (
                        <p className='text-sm text-destructive'>
                            {updateTeam.error.message}
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
