import { Link } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut, User } from 'lucide-react';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { useTeams, useSwitchTeam } from '@/hooks/use-teams';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
    const { data: user } = useCurrentUser();
    const { data: teams } = useTeams();
    const switchTeam = useSwitchTeam();
    const logout = useLogout();
    const { theme, toggleTheme, toggleSidebar } = useAppStore();

    const initials = user?.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : (user?.email?.slice(0, 2).toUpperCase() ?? '?');

    const currentTeam = teams?.find((t) => t.id === user?.team_id);

    return (
        <header className='flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6'>
            {/* Left: mobile menu + team context */}
            <div className='flex items-center gap-3'>
                <Button
                    variant='ghost'
                    size='icon'
                    className='lg:hidden'
                    onClick={toggleSidebar}
                >
                    <Menu className='h-5 w-5' />
                    <span className='sr-only'>Toggle sidebar</span>
                </Button>

                {/* Team switcher */}
                {teams && teams.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant='outline'
                                size='sm'
                                className='gap-2'
                            >
                                <span className='max-w-[120px] truncate'>
                                    {currentTeam?.name ?? 'Select team'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='start'>
                            <DropdownMenuLabel>Switch team</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {teams.map((team) => (
                                <DropdownMenuItem
                                    key={team.id}
                                    onClick={() => switchTeam.mutate(team.id)}
                                    className={
                                        team.id === user?.team_id
                                            ? 'bg-accent'
                                            : undefined
                                    }
                                >
                                    {team.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Right: theme toggle + user menu */}
            <div className='flex items-center gap-2'>
                <Button variant='ghost' size='icon' onClick={toggleTheme}>
                    {theme === 'dark' ? (
                        <Sun className='h-5 w-5' />
                    ) : (
                        <Moon className='h-5 w-5' />
                    )}
                    <span className='sr-only'>Toggle theme</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant='ghost'
                            className='relative h-9 w-9 rounded-full'
                        >
                            <Avatar className='h-9 w-9'>
                                <AvatarFallback className='bg-primary text-primary-foreground text-xs'>
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuLabel>
                            <div className='flex flex-col space-y-1'>
                                <p className='text-sm font-medium'>
                                    {user?.name ?? 'User'}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                to='/dashboard/settings'
                                className='w-full cursor-pointer'
                            >
                                <User className='mr-2 h-4 w-4' />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout.mutate()}>
                            <LogOut className='mr-2 h-4 w-4' />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
