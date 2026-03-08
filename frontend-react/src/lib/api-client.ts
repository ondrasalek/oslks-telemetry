import axios from 'axios';

/**
 * Shared Axios instance for all API calls.
 *
 * – baseURL is empty so requests go through the Vite dev proxy in
 *   development and hit the same origin in production.
 * – withCredentials ensures the HttpOnly session cookie is attached.
 */
const apiClient = axios.create({
    baseURL: '',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Response interceptor ─────────────────────────────────
// 401 redirects are handled by ProtectedRoute via useCurrentUser, not here.
// Redirecting on every 401 (e.g. from analytics/teams) kicks the user out
// even when their session is still valid, causing a login loop.
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (axios.isAxiosError(error)) {
            console.error(
                `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
                error.response?.status,
                error.response?.data || error.message,
            );
        }
        return Promise.reject(error);
    },
);

export default apiClient;
