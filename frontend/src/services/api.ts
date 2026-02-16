import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, clearAuthStorage } from '@/utils/storage';

// Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Create Axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // On 401, clear stored tokens so stale credentials don't persist.
    // Do NOT redirect here — AuthProvider and page-level guards handle
    // navigation. A hard redirect (window.location.href) would trigger a
    // full page reload, which re-mounts AuthProvider, which calls
    // checkAuth() again, causing an infinite reload loop.
    if (error.response?.status === 401) {
      clearAuthStorage();
    }

    // Transform error to a more usable format
    const apiError = {
      detail: (error.response?.data as Record<string, unknown>)?.detail as string || error.message || 'An error occurred',
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
