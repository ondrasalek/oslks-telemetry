import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { ApiKey, CreatedApiKey } from '@/types/api';

// ── Query Keys ───────────────────────────────────────────
export const apiKeyKeys = {
    all: ['api-keys'] as const,
};

// ── Queries ──────────────────────────────────────────────

/** List the current user's active API keys (prefix and metadata only). */
export function useApiKeys() {
    return useQuery<ApiKey[]>({
        queryKey: apiKeyKeys.all,
        queryFn: async () => {
            const { data } = await apiClient.get<ApiKey[]>('/api/api-keys');
            return data;
        },
    });
}

// ── Mutations ────────────────────────────────────────────

/** Create a key. The response carries the full secret — it is never retrievable again. */
export function useCreateApiKey() {
    const queryClient = useQueryClient();

    return useMutation<CreatedApiKey, Error, { name: string; team_id?: string }>(
        {
            mutationFn: async (payload) => {
                const { data } = await apiClient.post<CreatedApiKey>(
                    '/api/api-keys',
                    payload,
                );
                return data;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
            },
        },
    );
}

/** Revoke a key. */
export function useRevokeApiKey() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/api-keys/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
        },
    });
}
