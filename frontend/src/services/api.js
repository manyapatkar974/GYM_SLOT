import axios from 'axios';

/**
 * Dynamically resolves the API base URL.
 * Automatically adapts between localhost and VS Code Dev Tunnels.
 */
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing via dev tunnels (e.g. shjc1vkl-5173.inc1.devtunnels.ms)
    if (hostname.includes('.devtunnels.ms')) {
      const backendHost = hostname.replace('-5173', '-5000');
      return `https://${backendHost}/api`;
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};

/**
 * Axios instance configured with dynamic base URL and JWT interceptors.
 */
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer JWT
api.interceptors.request.use(
  (config) => {
    // Dynamically ensure base URL is set for the current session
    config.baseURL = getBaseUrl();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unified error handling and session expiration redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
