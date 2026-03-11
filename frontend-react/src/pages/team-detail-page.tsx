import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useTeam,
    useTeamMembers,
    useCreateInvite,
    useTransferTeamOwnership,
} from '@/hooks/use-teams';
import { useEnvConfig } from '@/hooks/use-config';
import { useTeamWebsites } from '@/hooks/use-websites';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Users, Globe, MoreVertical, Shield } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TeamDetailPage() {
    const { id } = useParams<{ id: string }>();
    const teamId = id ?? '';

    const { data: team, isLoading: teamLoading } = useTeam(teamId);
    const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
    const { data: websites, isLoading: websitesLoading } =
        useTeamWebsites(teamId);
    const transferOwnership = useTransferTeamOwnership(teamId);
    const { data: config } = useEnvConfig();
    const [showAddMember, setShowAddMember] = useState(false);

    if (teamLoading) {
        return (
            <div className='space-y-6'>
                <Skeleton className='h-8 w-48' />
                <div className='grid gap-6 lg:grid-cols-2'>
                    <Skeleton className='h-64 w-full' />
                    <Skeleton className='h-64 w-full' />
                </div>
            </div>
        );
    }

    if (!team) {
        return <p className='text-muted-foreground'>Team not found.</p>;
    }

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        {team.name}
                    </h1>
                    <p className='text-muted-foreground'>
                        Manage your team and collective resources.
                    </p>
                </div>
                {config?.smtp_enabled && (
                    <Button onClick={() => setShowAddMember(true)}>
                        Invite Member
                    </Button>
                )}
            </div>

            <Tabs defaultValue='members' className='w-full'>
                <TabsList className='mb-4'>
                    <TabsTrigger value='members' className='gap-2'>
                        <Users className='h-4 w-4' />
                        Members
                    </TabsTrigger>
                    <TabsTrigger value='websites' className='gap-2'>
                        <Globe className='h-4 w-4' />
                        Websites
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='members' className='m-0'>
                    <Card>
                        <CardContent className='p-0'>
                            {membersLoading ? (
                                <div className='space-y-4'>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className='flex items-center justify-between pb-3 border-b'
                                        >
                                            <div className='flex items-center gap-3'>
                                                <Skeleton className='h-8 w-8 rounded-full' />
                                                <div className='space-y-1'>
                                                    <Skeleton className='h-4 w-32' />
                                                    <Skeleton className='h-3 w-24' />
                                                </div>
                                            </div>
                                            <Skeleton className='h-5 w-16' />
                                        </div>
                                    ))}
                                </div>
                            ) : members && members.length > 0 ? (
                                <div className='rounded-md border'>
                                    <table className='w-full text-sm'>
                                        <thead>
                                            <tr className='border-b bg-muted/50'>
                                                <th className='p-3 text-left font-medium'>
                                                    Member
                                                </th>
                                                <th className='p-3 text-left font-medium'>
                                                    Role
                                                </th>
                                                <th className='p-3 text-left font-medium'>
                                                    Joined
                                                </th>
                                                <th className='p-3 text-right font-medium'>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map((member) => (
                                                <tr
                                                    key={member.user_id}
                                                    className='border-b last:border-0'
                                                >
                                                    <td className='p-3'>
                                                        <div className='flex items-center gap-3'>
                                                            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                                                                <span className='text-xs font-bold uppercase'>
                                                                    {member
                                                                        .user_name?.[0] ||
                                                                        member
                                                                            .user_email[0]}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className='font-medium'>
                                                                    {member.user_name ||
                                                                        member.user_email}
                                                                </p>
                                                                <p className='text-xs text-muted-foreground'>
                                                                    {
                                                                        member.user_email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className='p-3'>
                                                        <Badge
                                                            variant='outline'
                                                            className='capitalize cursor-default'
                                                        >
                                                            {member.role}
                                                        </Badge>
                                                    </td>
                                                    <td className='p-3 text-muted-foreground text-xs'>
                                                        {format(
                                                            parseISO(
                                                                member.joined_at,
                                                            ),
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
                                                                    onClick={() => {
                                                                        if (
                                                                            confirm(
                                                                                `Transfer ownership to ${member.user_name || member.user_email}?`,
                                                                            )
                                                                        ) {
                                                                            transferOwnership.mutate(
                                                                                {
                                                                                    new_owner_id:
                                                                                        member.user_id,
                                                                                },
                                                                            );
                                                                        }
                                                                    }}
                                                                    className='gap-2'
                                                                    disabled={
                                                                        member.role ===
                                                                        'owner'
                                                                    }
                                                                >
                                                                    <Shield className='h-4 w-4' />
                                                                    Transfer
                                                                    Ownership
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
                                    No members found.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value='websites' className='m-0'>
                    <Card>
                        <CardContent className='p-0'>
                            {websitesLoading ? (
                                <div className='space-y-4'>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className='flex items-center justify-between pb-3 border-b'
                                        >
                                            <div className='flex items-center gap-3'>
                                                <Skeleton className='h-8 w-8 rounded' />
                                                <div className='space-y-1'>
                                                    <Skeleton className='h-4 w-32' />
                                                    <Skeleton className='h-3 w-24' />
                                                </div>
                                            </div>
                                            <Skeleton className='h-5 w-16' />
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
                                                    Status
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
                                                        <Link
                                                            to={`/dashboard/sites/${site.id}`}
                                                            className='flex items-center gap-3 group/link hover:opacity-80 transition-opacity'
                                                        >
                                                            {site.icon_url ? (
                                                                <img
                                                                    src={
                                                                        site.icon_url
                                                                    }
                                                                    className='h-8 w-8 rounded object-cover'
                                                                    alt=''
                                                                    onError={(
                                                                        e,
                                                                    ) => {
                                                                        e.currentTarget.style.display =
                                                                            'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove(
                                                                            'hidden',
                                                                        );
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                className={cn(
                                                                    'h-8 w-8 rounded bg-muted flex items-center justify-center',
                                                                    site.icon_url &&
                                                                        'hidden',
                                                                )}
                                                            >
                                                                <Globe className='h-4 w-4 text-muted-foreground' />
                                                            </div>
                                                            <div>
                                                                <p className='font-medium text-primary hover:underline'>
                                                                    {site.name ||
                                                                        site.domain}
                                                                </p>
                                                                <p className='text-xs text-muted-foreground'>
                                                                    {
                                                                        site.domain
                                                                    }
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className='p-3'>
                                                        <Badge
                                                            variant={
                                                                site.status ===
                                                                'active'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {site.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className='flex flex-col items-center justify-center py-6 border rounded-lg border-dashed'>
                                    <Globe className='mb-2 h-8 w-8 text-muted-foreground' />
                                    <p className='text-sm text-muted-foreground text-center'>
                                        No websites in this team.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {showAddMember && (
                <InviteMemberModal
                    teamId={teamId}
                    onClose={() => setShowAddMember(false)}
                />
            )}
        </div>
    );
}

function InviteMemberModal({
    teamId,
    onClose,
}: {
    teamId: string;
    onClose: () => void;
}) {
    const createInvite = useCreateInvite(teamId);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'member' | 'admin'>('member');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        createInvite.mutate(
            { email, role },
            {
                onSuccess: () => {
                    setSuccessMessage(`Invitation sent to ${email}`);
                    setTimeout(() => {
                        onClose();
                        setSuccessMessage('');
                    }, 2000);
                },
            },
        );
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation email to add a user to this team.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='member-email'>Email</Label>
                        <Input
                            id='member-email'
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='member-role'>Role</Label>
                        <Select
                            value={role}
                            onValueChange={(val) =>
                                setRole(val as 'member' | 'admin')
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Select a role' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='member'>Member</SelectItem>
                                <SelectItem value='admin'>Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {createInvite.error && (
                        <p className='text-sm text-destructive'>
                            {createInvite.error.message}
                        </p>
                    )}
                    {successMessage && (
                        <p className='text-sm text-green-600'>
                            {successMessage}
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
                            disabled={
                                createInvite.isPending || !!successMessage
                            }
                        >
                            {createInvite.isPending
                                ? 'Sending...'
                                : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
