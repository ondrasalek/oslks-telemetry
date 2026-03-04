import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface EnvConfig {
    smtp_enabled: boolean;
}

export const configKeys = {
    env: ['config', 'env'] as const,
};

/**
 * Fetch global feature flags (like SMTP configuration presence)
 * from the backend `/api/config/env` endpoint.
 */
export function useEnvConfig() {
    return useQuery<EnvConfig>({
        queryKey: configKeys.env,
        queryFn: async () => {
            const { data } = await apiClient.get<EnvConfig>('/api/config/env');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 min
    });
}
