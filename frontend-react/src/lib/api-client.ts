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

// ── Response interceptor: redirect on 401 ────────────────
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            !window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/invite/accept') &&
            !window.location.pathname.startsWith('/register')
        ) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default apiClient;
