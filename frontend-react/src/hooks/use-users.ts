import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { AuthUser } from '@/types/api';

export const userKeys = {
    all: ['admin-users'] as const,
};

export function useUsers() {
    return useQuery<AuthUser[]>({
        queryKey: userKeys.all,
        queryFn: async () => {
            const { data } = await apiClient.get<AuthUser[]>('/api/users');
            return data;
        },
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation<
        AuthUser,
        Error,
        { name?: string; email: string; password?: string; role: string }
    >({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{
                success: boolean;
                user?: AuthUser;
                error?: string;
            }>('/api/users', payload);
            if (!data.success)
                throw new Error(data.error || 'Failed to create user');
            return data.user!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: string; name?: string; email?: string; role?: string }
    >({
        mutationFn: async ({ id, ...payload }) => {
            await apiClient.put(`/api/users/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export interface ResetPasswordResult {
    emailed: boolean;
    /** Only present when the email could not be sent; shown once to the admin. */
    password?: string;
    email_error?: string;
}

/** Issue a one-time password for a user (superuser only). */
export function useResetPassword() {
    return useMutation<ResetPasswordResult, Error, string>({
        mutationFn: async (id) => {
            const { data } = await apiClient.post<ResetPasswordResult>(
                `/api/users/${id}/reset-password`,
            );
            return data;
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}
