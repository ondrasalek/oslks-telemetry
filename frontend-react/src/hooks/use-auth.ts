import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type {
    SessionUser,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
} from '@/types/api';

// ── Query Keys ───────────────────────────────────────────
export const authKeys = {
    currentUser: ['auth', 'currentUser'] as const,
};

// ── Queries ──────────────────────────────────────────────

/** Fetch the currently authenticated user (session-based). */
export function useCurrentUser() {
    return useQuery<SessionUser | null>({
        queryKey: authKeys.currentUser,
        queryFn: async () => {
            try {
                const { data } = await apiClient.get<SessionUser | null>(
                    '/api/auth/me',
                );
                return data;
            } catch (error: unknown) {
                // Session expired — clear state and redirect to login
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 401 &&
                    !window.location.pathname.startsWith('/login')
                ) {
                    window.location.href = '/login';
                }
                return null;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 min
    });
}

// ── Mutations ────────────────────────────────────────────

/** Login mutation — POST /api/Login */
export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation<LoginResponse, Error, LoginRequest>({
        mutationFn: async (credentials) => {
            const { data } = await apiClient.post<LoginResponse>(
                '/api/auth/login',
                credentials,
            );
            return data;
        },
        onSuccess: (data) => {
            if (data.success && data.user) {
                queryClient.setQueryData(authKeys.currentUser, data.user);
            }
        },
    });
}

/** Logout mutation — POST /api/Logout */
export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation<void, Error>({
        mutationFn: async () => {
            await apiClient.post('/api/auth/logout');
        },
        onSuccess: () => {
            queryClient.setQueryData(authKeys.currentUser, null);
            queryClient.clear();
            window.location.href = '/login';
        },
    });
}

/** Registration mutation — POST /api/auth/register */
export function useRegister() {
    const queryClient = useQueryClient();

    return useMutation<LoginResponse, Error, RegisterRequest>({
        mutationFn: async (userData) => {
            const { data } = await apiClient.post<LoginResponse>(
                '/api/auth/register',
                userData,
            );
            return data;
        },
        onSuccess: (data) => {
            if (data.success && data.user) {
                queryClient.setQueryData(authKeys.currentUser, data.user);
            }
        },
    });
}
