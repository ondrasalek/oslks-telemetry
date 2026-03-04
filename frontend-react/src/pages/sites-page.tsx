import { Link } from 'react-router-dom';
import {
    Globe,
    Plus,
    Edit,
    Trash2,
    MoreVertical,
    Star,
    Share2,
    ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useWebsites,
    useAddWebsite,
    useDeleteWebsite,
    useUpdateWebsite,
    useTogglePinWebsite,
    useUpdateWebsiteShare,
    useTransferWebsite,
} from '@/hooks/use-websites';
import { useTeams } from '@/hooks/use-teams';
import { useCurrentUser } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { Website } from '@/types/api';

export function SitesPage() {
    const { data: user } = useCurrentUser();
    const { data: websites, isLoading } = useWebsites();
    const { data: teams } = useTeams();
    const addWebsite = useAddWebsite();
    const deleteWebsite = useDeleteWebsite();
    const togglePin = useTogglePinWebsite();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [domain, setDomain] = useState('');
    const [name, setName] = useState('');

    const [editSite, setEditSite] = useState<Website | null>(null);
    const [shareSite, setShareSite] = useState<Website | null>(null);
    const [transferSite, setTransferSite] = useState<Website | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addWebsite.mutate(
            { domain, name: name || undefined },
            {
                onSuccess: () => {
                    setIsAddOpen(false);
                    setDomain('');
                    setName('');
                },
            },
        );
    };

    const handleDelete = (id: string) => {
        if (
            confirm(
                'Are you sure you want to delete this website? All analytics data will be lost.',
            )
        ) {
            deleteWebsite.mutate(id);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        Websites
                    </h1>
                    <p className='text-muted-foreground'>
                        Manage your tracked websites.
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size='sm' className='gap-2'>
                            <Plus className='h-4 w-4' />
                            Add website
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Website</DialogTitle>
                            <DialogDescription>
                                Track analytics for a new domain.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddSubmit} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='domain'>
                                    Domain (required)
                                </Label>
                                <Input
                                    id='domain'
                                    placeholder='example.com'
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='name'>
                                    Friendly Name (optional)
                                </Label>
                                <Input
                                    id='name'
                                    placeholder='My Awesome Blog'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            {addWebsite.error && (
                                <p className='text-sm text-destructive'>
                                    {addWebsite.error.message}
                                </p>
                            )}
                            <Button
                                type='submit'
                                className='w-full'
                                disabled={addWebsite.isPending}
                            >
                                {addWebsite.isPending
                                    ? 'Adding...'
                                    : 'Add Website'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className='h-full'>
                            <CardContent className='flex items-start gap-3 p-4'>
                                <Skeleton className='flex h-10 w-10 shrink-0 rounded-lg' />
                                <div className='min-w-0 flex-1 pr-8 space-y-2'>
                                    <Skeleton className='h-5 w-3/4' />
                                    <Skeleton className='h-4 w-1/2' />
                                    <Skeleton className='h-5 w-16 mt-2' />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : websites && websites.length > 0 ? (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {websites.map((site) => (
                        <div key={site.id} className='relative group'>
                            <Link to={`/dashboard/sites/${site.id}`}>
                                <Card className='transition-colors hover:border-primary/50 h-full'>
                                    <CardContent className='flex items-start gap-3 p-4'>
                                        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground relative overflow-hidden'>
                                            {site.icon_url ? (
                                                <img
                                                    src={site.icon_url}
                                                    alt={`${site.domain} favicon`}
                                                    className='w-full h-full object-cover'
                                                    onError={(e) => {
                                                        // Fallback to globe if image fails to load
                                                        e.currentTarget.style.display =
                                                            'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove(
                                                            'hidden',
                                                        );
                                                    }}
                                                />
                                            ) : null}
                                            {site.is_pinned ? (
                                                <div
                                                    className={cn(
                                                        'absolute inset-0 flex items-center justify-center bg-background/80',
                                                        !site.icon_url &&
                                                            'bg-transparent',
                                                    )}
                                                >
                                                    <Star className='h-5 w-5 fill-primary text-primary' />
                                                </div>
                                            ) : (
                                                <Globe
                                                    className={cn(
                                                        'h-5 w-5',
                                                        site.icon_url &&
                                                            'hidden',
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <div className='min-w-0 flex-1 pr-8'>
                                            <p className='truncate font-medium'>
                                                {site.name ?? site.domain}
                                            </p>
                                            <p className='truncate text-sm text-muted-foreground'>
                                                {site.domain}
                                            </p>
                                            <div className='mt-2 flex items-center gap-2'>
                                                <Badge
                                                    variant={
                                                        site.status === 'active'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {site.status ?? 'unknown'}
                                                </Badge>
                                                {site.share_id && (
                                                    <Badge
                                                        variant='outline'
                                                        className='text-[10px]'
                                                    >
                                                        Public
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <div className='absolute top-2 right-2 flex items-center gap-1'>
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
                                    <DropdownMenuContent
                                        align='end'
                                        className='w-48'
                                    >
                                        <DropdownMenuItem
                                            onClick={() =>
                                                togglePin.mutate(site.id)
                                            }
                                            className='gap-2'
                                        >
                                            <Star className='h-4 w-4' />
                                            {site.is_pinned ? 'Unpin' : 'Pin'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setEditSite(site)}
                                            className='gap-2'
                                        >
                                            <Edit className='h-4 w-4' />
                                            Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setShareSite(site)}
                                            className='gap-2'
                                        >
                                            <Share2 className='h-4 w-4' />
                                            Public Analytics
                                        </DropdownMenuItem>
                                        {/* Allow transfer only if user is superuser or multiple teams exist */}
                                        {(user?.role === 'superuser' ||
                                            (teams && teams.length > 1)) && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setTransferSite(site)
                                                }
                                                className='gap-2'
                                            >
                                                <ArrowRightLeft className='h-4 w-4' />
                                                Transfer Team
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleDelete(site.id)
                                            }
                                            className='gap-2 text-destructive focus:text-destructive'
                                        >
                                            <Trash2 className='h-4 w-4' />
                                            Delete Website
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
                        <Globe className='mb-4 h-12 w-12 text-muted-foreground/50' />
                        <p className='text-muted-foreground'>
                            No websites yet.
                        </p>
                    </CardContent>
                </Card>
            )}

            {editSite && (
                <EditWebsiteModal
                    site={editSite}
                    onClose={() => setEditSite(null)}
                />
            )}

            {shareSite && (
                <ShareWebsiteModal
                    site={shareSite}
                    onClose={() => setShareSite(null)}
                />
            )}

            {transferSite && (
                <TransferWebsiteModal
                    site={transferSite}
                    teams={teams || []}
                    onClose={() => setTransferSite(null)}
                />
            )}
        </div>
    );
}

function EditWebsiteModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const updateWebsite = useUpdateWebsite();
    const [name, setName] = useState(site.name || '');
    const [domain, setDomain] = useState(site.domain);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateWebsite.mutate(
            { id: site.id, name, domain },
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
                    <DialogTitle>Edit Website</DialogTitle>
                    <DialogDescription>
                        Update name or domain for this website.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-domain'>Domain</Label>
                        <Input
                            id='edit-domain'
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-name'>Friendly Name</Label>
                        <Input
                            id='edit-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    {updateWebsite.error && (
                        <p className='text-sm text-destructive'>
                            {updateWebsite.error.message}
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
                            disabled={updateWebsite.isPending}
                        >
                            {updateWebsite.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ShareWebsiteModal({
    site,
    onClose,
}: {
    site: Website;
    onClose: () => void;
}) {
    const updateShare = useUpdateWebsiteShare();
    const [shareId, setShareId] = useState(site.share_id || '');
    const [isEnabled, setIsEnabled] = useState(!!site.share_id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateShare.mutate(
            {
                id: site.id,
                share_id: isEnabled
                    ? shareId || crypto.randomUUID().split('-')[0]
                    : null,
            },
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
                    <DialogTitle>Public Share</DialogTitle>
                    <DialogDescription>
                        Generate a unique link to share this website's analytics
                        publicly.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='flex items-center space-x-2'>
                        <input
                            type='checkbox'
                            id='enable-share'
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        <Label htmlFor='enable-share'>
                            Enable public viewing link
                        </Label>
                    </div>
                    {isEnabled && (
                        <div className='space-y-2 pl-6'>
                            <Label htmlFor='share-id'>
                                Custom Share ID (Optional)
                            </Label>
                            <div className='flex gap-2'>
                                <Input
                                    id='share-id'
                                    value={shareId}
                                    onChange={(e) => setShareId(e.target.value)}
                                    placeholder='e.g., my-public-stats'
                                />
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                Your public link will be:{' '}
                                {window.location.origin}/share/
                                {shareId || '...'}
                            </p>
                        </div>
                    )}
                    {updateShare.error && (
                        <p className='text-sm text-destructive'>
                            {updateShare.error.message}
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
                        <Button type='submit' disabled={updateShare.isPending}>
                            {updateShare.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function TransferWebsiteModal({
    site,
    teams,
    onClose,
}: {
    site: Website;
    teams: any[];
    onClose: () => void;
}) {
    const transferWebsite = useTransferWebsite();
    const [teamId, setTeamId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamId) return;
        transferWebsite.mutate(
            { id: site.id, team_id: teamId },
            {
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer Website</DialogTitle>
                    <DialogDescription>
                        Move this website and its analytics data to another
                        team.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='team-select'>Destination Team</Label>
                        <Select
                            value={teamId}
                            onValueChange={setTeamId}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Select a team' />
                            </SelectTrigger>
                            <SelectContent>
                                {teams
                                    .filter((t) => t.id !== site.team_id)
                                    .map((team) => (
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
                    {transferWebsite.error && (
                        <p className='text-sm text-destructive'>
                            {transferWebsite.error.message}
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
                            disabled={transferWebsite.isPending || !teamId}
                        >
                            {transferWebsite.isPending
                                ? 'Transferring...'
                                : 'Transfer Website'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
