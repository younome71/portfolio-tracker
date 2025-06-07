import axios from 'axios';
import { store } from '../store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const { token } = store.getState().auth;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      console.error('Unauthorized access - please login again');
    }
    return Promise.reject(error);
  }
);

export default api;
