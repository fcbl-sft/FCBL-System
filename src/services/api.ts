/**
 * Base API client for communicating with the FastAPI backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

interface ApiError {
    detail: string;
}

/**
 * Fetch wrapper with error handling.
 */
async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const url = `${API_BASE_URL}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
            return { data: null, error: errorData.detail || `HTTP error ${response.status}` };
        }

        const data = await response.json();
        return { data: data.data ?? data, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error';
        console.error('API Error:', message);
        return { data: null, error: message };
    }
}

/**
 * API client methods
 */
export const api = {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    put: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        }),

    patch: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),

    delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
};

export default api;
