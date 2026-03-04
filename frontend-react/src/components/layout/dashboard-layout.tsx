import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { Header } from './header';
import { useAppStore } from '@/stores/app-store';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Main dashboard shell:
 *
 *  ┌──────────┬───────────────────────┐
 *  │ Sidebar  │ Header                │
 *  │          ├───────────────────────┤
 *  │          │ Content (<Outlet />)  │
 *  │          │                       │
 *  └──────────┴───────────────────────┘
 *
 * On mobile the sidebar is rendered inside a Sheet (slide-over).
 */
export function DashboardLayout() {
    const { sidebarOpen, setSidebarOpen } = useAppStore();
    const location = useLocation();

    // Close mobile sidebar when resizing to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024 && sidebarOpen) {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [sidebarOpen, setSidebarOpen]);

    return (
        <div className='flex h-screen overflow-hidden bg-background'>
            {/* Desktop sidebar */}
            <div className='hidden lg:flex lg:shrink-0'>
                <AppSidebar />
            </div>

            {/* Mobile sidebar — Sheet */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side='left' className='w-64 p-0 lg:hidden'>
                    <SheetTitle className='sr-only'>Navigation</SheetTitle>
                    <AppSidebar />
                </SheetContent>
            </Sheet>

            {/* Main content area */}
            <div className={cn('flex flex-1 flex-col overflow-hidden')}>
                <Header />
                <main
                    key={location.pathname}
                    className='flex-1 overflow-y-auto p-4 lg:p-6'
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
