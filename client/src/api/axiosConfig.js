import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';

const API = axios.create({
  baseURL: API_BASE,
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pathprohori_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
