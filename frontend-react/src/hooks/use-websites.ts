import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { Website } from '@/types/api';

// ── Query Keys ───────────────────────────────────────────
export const websiteKeys = {
    all: ['websites'] as const,
    detail: (id: string) => ['websites', id] as const,
    public: (shareId: string) => ['websites', 'public', shareId] as const,
};

// ── Queries ──────────────────────────────────────────────

/** List all websites visible to the current user/team. */
export function useWebsites() {
    return useQuery<Website[]>({
        queryKey: websiteKeys.all,
        queryFn: async () => {
            const { data } = await apiClient.get<Website[]>('/api/websites');
            return data;
        },
    });
}

/** Fetch a single website by ID. */
export function useWebsite(id: string) {
    return useQuery<Website | null>({
        queryKey: websiteKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get<Website | null>(
                `/api/websites/${id}`,
            );
            return data;
        },
        enabled: !!id,
        retry: 6,
        retryDelay: 800,
    });
}

/** Fetch all websites for a specific team. */
export function useTeamWebsites(teamId: string) {
    return useQuery<Website[]>({
        queryKey: [...websiteKeys.all, 'team', teamId],
        queryFn: async () => {
            const { data } = await apiClient.get<Website[]>(
                `/api/websites/team/${teamId}`,
            );
            return data;
        },
        enabled: !!teamId,
    });
}

/** Fetch public website details by share ID. */
export function usePublicWebsite(shareId: string) {
    return useQuery<Website | null>({
        queryKey: websiteKeys.public(shareId),
        queryFn: async () => {
            const { data } = await apiClient.get<Website | null>(
                `/api/websites/shared/${shareId}`,
            );
            return data;
        },
        enabled: !!shareId,
    });
}

// ── Mutations ────────────────────────────────────────────

/** Add a new website. */
export function useAddWebsite() {
    const queryClient = useQueryClient();

    return useMutation<Website, Error, { domain: string; name?: string }>({
        mutationFn: async (payload) => {
            // Note: The new backend uses 'domain' instead of 'url', and returns JSON Result<Website, String> wrapped
            const { data } = await apiClient.post<{
                Ok?: Website;
                Err?: string;
            }>('/api/websites', payload);
            if (data.Err) throw new Error(data.Err);
            return data.Ok!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
        },
    });
}

/** Update a website. */
export function useUpdateWebsite() {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: string; domain?: string; name?: string }
    >({
        mutationFn: async ({ id, ...payload }) => {
            await apiClient.put(`/api/websites/${id}`, payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
            queryClient.invalidateQueries({
                queryKey: websiteKeys.detail(variables.id),
            });
        },
    });
}

/** Delete a website. */
export function useDeleteWebsite() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (websiteId) => {
            await apiClient.delete(`/api/websites/${websiteId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
        },
    });
}

/** Toggle pin status for a website. */
export function useTogglePinWebsite() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await apiClient.post(`/api/websites/${id}/toggle-pin`);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
            queryClient.invalidateQueries({ queryKey: websiteKeys.detail(id) });
        },
    });
}

/** Update website share ID. */
export function useUpdateWebsiteShare() {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        {
            id: string;
            share_id: string | null;
            share_config?: Record<string, boolean>;
        }
    >({
        mutationFn: async ({ id, ...payload }) => {
            await apiClient.put(`/api/websites/${id}/share`, payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
            queryClient.invalidateQueries({
                queryKey: websiteKeys.detail(variables.id),
            });
        },
    });
}

/** Reset website analytics data. */
export function useResetWebsiteData() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/websites/${id}/data`);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: websiteKeys.detail(id) });
        },
    });
}

/** Transfer website to another team. */
export function useTransferWebsite() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; team_id: string }>({
        mutationFn: async ({ id, ...payload }) => {
            await apiClient.post(`/api/websites/${id}/transfer`, payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: websiteKeys.all });
            queryClient.invalidateQueries({
                queryKey: websiteKeys.detail(variables.id),
            });
        },
    });
}
