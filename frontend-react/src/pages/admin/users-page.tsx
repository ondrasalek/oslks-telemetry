import {
    useUsers,
    useUpdateUser,
    useDeleteUser,
    useCreateUser,
} from '@/hooks/use-users';
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
import { Trash2, User as UserIcon, Edit, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AuthUser } from '@/types/api';

export function AdminUsersPage() {
    const { data: users, isLoading } = useUsers();
    const deleteUser = useDeleteUser();
    const [editUser, setEditUser] = useState<AuthUser | null>(null);
    const [showCreateUser, setShowCreateUser] = useState(false);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>
                        User Management
                    </h1>
                    <p className='text-muted-foreground'>
                        Manage all users across the platform.
                    </p>
                </div>
                <Button onClick={() => setShowCreateUser(true)}>
                    Create User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        A list of every user registered on this instance.
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
                                        <Skeleton className='h-8 w-8 rounded-full' />
                                        <div className='space-y-1'>
                                            <Skeleton className='h-4 w-32' />
                                            <Skeleton className='h-3 w-48' />
                                        </div>
                                    </div>
                                    <Skeleton className='h-6 w-20' />
                                    <Skeleton className='h-4 w-24' />
                                    <Skeleton className='h-8 w-8' />
                                </div>
                            ))}
                        </div>
                    ) : users && users.length > 0 ? (
                        <div className='rounded-md border'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b bg-muted/50'>
                                        <th className='p-3 text-left font-medium'>
                                            User
                                        </th>
                                        <th className='p-3 text-left font-medium'>
                                            Role
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
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className='border-b last:border-0'
                                        >
                                            <td className='p-3'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                                                        <UserIcon className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <p className='font-medium'>
                                                            {user.name ||
                                                                'No Name'}
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='p-3'>
                                                <Badge
                                                    variant={
                                                        user.role ===
                                                        'superuser'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                >
                                                    {user.role}
                                                </Badge>
                                            </td>
                                            <td className='p-3 text-muted-foreground'>
                                                {format(
                                                    parseISO(user.created_at),
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
                                                            onClick={() =>
                                                                setEditUser(
                                                                    user,
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
                                                                        `Delete user ${user.email}?`,
                                                                    )
                                                                ) {
                                                                    deleteUser.mutate(
                                                                        user.id,
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
                        <p className='text-center py-8 text-muted-foreground'>
                            No users found.
                        </p>
                    )}
                </CardContent>
            </Card>

            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                />
            )}

            {showCreateUser && (
                <CreateUserModal onClose={() => setShowCreateUser(false)} />
            )}
        </div>
    );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
    const createUser = useCreateUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'user' | 'admin' | 'superuser'>('user');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createUser.mutate(
            { name, email, password, role },
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
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>
                        Add a new user to the platform.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='create-name'>Name</Label>
                        <Input
                            id='create-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='create-email'>Email</Label>
                        <Input
                            id='create-email'
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='create-password'>Password</Label>
                        <Input
                            id='create-password'
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Leave blank for no password'
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='create-role'>Role</Label>
                        <Select
                            value={role}
                            onValueChange={(val) =>
                                setRole(val as 'superuser' | 'admin' | 'user')
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Select a role' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='user'>User</SelectItem>
                                <SelectItem value='admin'>Admin</SelectItem>
                                <SelectItem value='superuser'>
                                    Superuser
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {createUser.error && (
                        <p className='text-sm text-destructive'>
                            {createUser.error.message}
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
                        <Button type='submit' disabled={createUser.isPending}>
                            {createUser.isPending
                                ? 'Creating...'
                                : 'Create User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditUserModal({
    user,
    onClose,
}: {
    user: AuthUser;
    onClose: () => void;
}) {
    const updateUser = useUpdateUser();
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser.mutate(
            { id: user.id, name, email, role },
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
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Modify user details and roles.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-name'>Name</Label>
                        <Input
                            id='edit-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-email'>Email</Label>
                        <Input
                            id='edit-email'
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='edit-role'>Role</Label>
                        <Select
                            value={role}
                            onValueChange={(val) =>
                                setRole(val as 'superuser' | 'user')
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Select a role' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='user'>User</SelectItem>
                                <SelectItem value='admin'>Admin</SelectItem>
                                <SelectItem value='superuser'>
                                    Superuser
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {updateUser.error && (
                        <p className='text-sm text-destructive'>
                            {updateUser.error.message}
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
                        <Button type='submit' disabled={updateUser.isPending}>
                            {updateUser.isPending
                                ? 'Saving...'
                                : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
