import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    // ── Sidebar ──────────────────────────────────────────
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // ── Theme ────────────────────────────────────────────
    theme: 'dark' | 'light';
    toggleTheme: () => void;

    // ── Active team (client-side cache) ──────────────────
    currentTeamId: string | null;
    setCurrentTeamId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Sidebar
            sidebarOpen: false,
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),

            // Theme
            theme: 'dark',
            toggleTheme: () =>
                set((s) => {
                    const next = s.theme === 'dark' ? 'light' : 'dark';
                    document.documentElement.classList.toggle(
                        'dark',
                        next === 'dark',
                    );
                    return { theme: next };
                }),

            // Active team
            currentTeamId: null,
            setCurrentTeamId: (id) => set({ currentTeamId: id }),
        }),
        {
            name: 'oslks-app-store',
            partialize: (s) => ({
                theme: s.theme,
                currentTeamId: s.currentTeamId,
            }),
            onRehydrateStorage: () => (state) => {
                // Apply persisted theme on hydration
                if (state) {
                    document.documentElement.classList.toggle(
                        'dark',
                        state.theme === 'dark',
                    );
                }
            },
        },
    ),
);
