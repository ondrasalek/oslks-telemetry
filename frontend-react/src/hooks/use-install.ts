import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useInstallCheck() {
    return useQuery<{ installed: boolean; error: string | null }>({
        queryKey: ['install-check'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/install/check');
            return data;
        },
        retry: false,
    });
}
