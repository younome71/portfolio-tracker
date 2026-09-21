import axios from 'axios';
import { store } from '../store';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000/api',
});

export function getApiErrorMessage(error, fallback = 'Request failed') {
  return (
    error.response?.data?.error?.message ||
    error.response?.data?.msg ||
    error.response?.data?.message ||
    error.message ||
    fallback
  );
}

api.interceptors.request.use(
  (config) => {
    const { token } = store.getState().auth;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Avoid circular import with authSlice — use action type string
      store.dispatch({ type: 'auth/logout' });
      if (!window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
