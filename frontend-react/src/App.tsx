import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CookieBanner } from '@/components/cookies/CookieBanner';
import { Analytics } from '@/components/analytics/Analytics';

// Pages
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';
import { InstallPage } from '@/pages/install-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { SitesPage } from '@/pages/sites-page';
import { SiteDetailPage } from '@/pages/site-detail-page';
import { TeamsPage } from '@/pages/teams-page';
import { TeamDetailPage } from '@/pages/team-detail-page';
import { SettingsPage } from '@/pages/settings-page';
import { AdminUsersPage } from '@/pages/admin/users-page';
import { AdminTeamsPage } from '@/pages/admin/teams-page';
import { AdminWebsitesPage } from '@/pages/admin/websites-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { TermsPage } from '@/pages/terms-page';
import { PrivacyPage } from '@/pages/privacy-page';
import { CookiesPage } from '@/pages/cookies-page';
import { PublicSharePage } from '@/pages/public-share-page';
import { InvitePage } from '@/pages/invite-page';
import { RegisterPage } from '@/pages/register-page';

// ── Query Client ─────────────────────────────────────────
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000, // 1 min
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// ── App ──────────────────────────────────────────────────
export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    {/* Public routes */}
                    <Route path='/' element={<HomePage />} />
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='/register' element={<RegisterPage />} />
                    <Route path='/install' element={<InstallPage />} />
                    <Route path='/terms' element={<TermsPage />} />
                    <Route path='/privacy' element={<PrivacyPage />} />
                    <Route path='/cookies' element={<CookiesPage />} />
                    <Route
                        path='/share/:share_id'
                        element={<PublicSharePage />}
                    />
                    <Route path='/invite/accept' element={<InvitePage />} />

                    {/* Protected dashboard routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path='/dashboard' element={<DashboardLayout />}>
                            <Route index element={<DashboardPage />} />
                            <Route path='sites' element={<SitesPage />} />
                            <Route
                                path='sites/:id'
                                element={<SiteDetailPage />}
                            />
                            <Route path='teams' element={<TeamsPage />} />
                            <Route
                                path='teams/:id'
                                element={<TeamDetailPage />}
                            />
                            <Route path='settings' element={<SettingsPage />} />
                            <Route
                                path='admin/users'
                                element={<AdminUsersPage />}
                            />
                            <Route
                                path='admin/teams'
                                element={<AdminTeamsPage />}
                            />
                            <Route
                                path='admin/websites'
                                element={<AdminWebsitesPage />}
                            />
                        </Route>
                    </Route>

                    {/* Catch-all */}
                    <Route path='*' element={<NotFoundPage />} />
                </Routes>
                <CookieBanner />
                <Analytics />
            </BrowserRouter>
        </QueryClientProvider>
    );
}
