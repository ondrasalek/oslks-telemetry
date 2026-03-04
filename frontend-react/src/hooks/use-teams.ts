import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { Team, TeamMember } from '@/types/api';
import { authKeys } from './use-auth';

// ── Query Keys ───────────────────────────────────────────
export const teamKeys = {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
};

// ── Queries ──────────────────────────────────────────────

/** List all teams the current user belongs to. */
export function useTeams() {
    return useQuery<Team[]>({
        queryKey: teamKeys.all,
        queryFn: async () => {
            const { data } = await apiClient.get<Team[]>('/api/teams');
            return data;
        },
    });
}

/** Get detail for a specific team. */
export function useTeam(id: string) {
    return useQuery<Team | null>({
        queryKey: teamKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get<Team | null>(
                `/api/teams/${id}`,
            );
            return data;
        },
        enabled: !!id,
    });
}

/** Get members for a specific team. */
export function useTeamMembers(teamId: string) {
    return useQuery<TeamMember[]>({
        queryKey: [...teamKeys.detail(teamId), 'members'],
        queryFn: async () => {
            const { data } = await apiClient.get<TeamMember[]>(
                `/api/teams/${teamId}/members`,
            );
            return data;
        },
        enabled: !!teamId,
    });
}

// ── Mutations ────────────────────────────────────────────

/** Create a new team. */
export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation<Team, Error, { name: string }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ Ok?: Team; Err?: string }>(
                '/api/teams',
                payload,
            );
            if (data.Err) throw new Error(data.Err);
            return data.Ok!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        },
    });
}
/** Switch the active team context. */
export function useSwitchTeam() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (teamId) => {
            await apiClient.post(`/api/teams/${teamId}/switch`);
        },
        onSuccess: () => {
            // Refresh user (team_id changes) and all data
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
            queryClient.invalidateQueries();
        },
    });
}

/** Update a team. */
export function useUpdateTeam() {
    const queryClient = useQueryClient();

    return useMutation<
        void,
        Error,
        { id: string; name?: string; slug?: string }
    >({
        mutationFn: async ({ id, ...payload }) => {
            await apiClient.put(`/api/teams/${id}`, payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            queryClient.invalidateQueries({
                queryKey: teamKeys.detail(variables.id),
            });
        },
    });
}

/** Delete a team. */
export function useDeleteTeam() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/teams/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
        },
    });
}

/** Add a team member. */
export function useAddTeamMember(teamId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { email: string; role: string }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{
                success: boolean;
                error?: string;
            }>(`/api/teams/${teamId}/members`, payload);
            if (!data.success)
                throw new Error(data.error || 'Failed to add member');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...teamKeys.detail(teamId), 'members'],
            });
        },
    });
}

/** Transfer team ownership. */
export function useTransferTeamOwnership(teamId: string) {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { new_owner_id: string }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{
                success: boolean;
                error?: string;
            }>(`/api/teams/${teamId}/transfer`, payload);
            if (!data.success)
                throw new Error(data.error || 'Failed to transfer ownership');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...teamKeys.detail(teamId), 'members'],
            });
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
        },
    });
}

// ── Team Invitations ──────────────────────────────────────────────────────

export interface TeamInviteInfo {
    id: string;
    team_id: string;
    team_name: string;
    email: string;
    role: string;
    invited_by_name: string | null;
    expires_at: string;
}

/** Create a team invite. */
export function useCreateInvite(teamId: string) {
    return useMutation<void, Error, { email: string; role: string }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{
                success: boolean;
                error?: string;
            }>(`/api/teams/${teamId}/invites`, payload);
            if (!data.success)
                throw new Error(data.error || 'Failed to send invite');
        },
    });
}

/** Get team invite info. */
export function useGetInvite(token: string) {
    return useQuery<TeamInviteInfo | null>({
        queryKey: ['invites', token],
        queryFn: async () => {
            if (!token) return null;
            const { data } = await apiClient.get<TeamInviteInfo | null>(
                `/api/teams/invites/${token}`,
            );
            return data;
        },
        enabled: !!token,
    });
}

/** Accept a team invite. */
export function useAcceptInvite(token: string) {
    const queryClient = useQueryClient();

    return useMutation<void, Error, void>({
        mutationFn: async () => {
            const { data } = await apiClient.post<{
                success: boolean;
                error?: string;
            }>(`/api/teams/invites/${token}/accept`);
            if (!data.success)
                throw new Error(data.error || 'Failed to accept invite');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        },
    });
}
