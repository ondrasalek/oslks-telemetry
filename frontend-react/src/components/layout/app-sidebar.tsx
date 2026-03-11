import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Globe,
    Building2,
    Settings,
    Users,
    Mail,
    type LucideIcon,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/app-store';

// ── Navigation items ─────────────────────────────────────
interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
}

const mainNav: NavItem[] = [
    {
        label: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        exact: true,
    },
    { label: 'Websites', href: '/dashboard/sites', icon: Globe },
    { label: 'Teams', href: '/dashboard/teams', icon: Building2 },
    { label: 'Profile & API', href: '/dashboard/settings', icon: Settings },
];

const adminNav: NavItem[] = [
    { label: 'Users', href: '/dashboard/admin/users', icon: Users },
    { label: 'All Teams', href: '/dashboard/admin/teams', icon: Building2 },
    { label: 'All Websites', href: '/dashboard/admin/websites', icon: Globe },
    { label: 'Instance Settings', href: '/dashboard/settings', icon: Mail },
];

// ── Component ────────────────────────────────────────────
export function AppSidebar() {
    const { data: user } = useCurrentUser();
    const location = useLocation();
    const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

    const isActive = (href: string, exact?: boolean) =>
        exact ? location.pathname === href : location.pathname.startsWith(href);

    return (
        <aside className='flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar'>
            {/* Logo / Header */}
            <div className='flex h-16 items-center gap-2 border-b border-sidebar-border px-4'>
                <NavLink
                    to='/dashboard'
                    className='flex items-center gap-2'
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg'>
                        <img
                            src='/icon.svg'
                            alt='Logo'
                            className='h-full w-full object-contain'
                        />
                    </div>
                    <div className='flex flex-col leading-tight'>
                        <span className='font-semibold text-sidebar-foreground'>
                            OSLKS
                        </span>
                        <span className='text-xs text-sidebar-foreground/70'>
                            Radar
                        </span>
                    </div>
                </NavLink>
            </div>

            {/* Navigation */}
            <nav className='flex-1 overflow-y-auto p-4'>
                <div className='space-y-1'>
                    {mainNav.map((item) => (
                        <SidebarLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href, item.exact)}
                            onClick={() => setSidebarOpen(false)}
                        />
                    ))}
                </div>

                {/* Admin section — superuser only */}
                {user?.role === 'superuser' && (
                    <>
                        <Separator className='my-4' />
                        <p className='mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50'>
                            Administration
                        </p>
                        <div className='space-y-1'>
                            {adminNav.map((item) => (
                                <SidebarLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item.href)}
                                    onClick={() => setSidebarOpen(false)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </nav>
        </aside>
    );
}

// ── Sidebar link ─────────────────────────────────────────
function SidebarLink({
    item,
    active,
    onClick,
}: {
    item: NavItem;
    active: boolean;
    onClick?: () => void;
}) {
    const Icon = item.icon;

    return (
        <NavLink
            to={item.href}
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
            )}
        >
            <Icon className='h-[18px] w-[18px]' />
            {item.label}
        </NavLink>
    );
}
