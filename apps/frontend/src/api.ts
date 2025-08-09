// Клиент Axios для общения с backend API.  Базовый URL читается из
// переменной окружения Vite (`VITE_BACKEND_URL`) или по умолчанию
// http://localhost:4000/api.  Перед каждым запросом, если в localStorage
// находится JWT, он добавляется в заголовок Authorization.
import axios from 'axios';

// Create an Axios instance.  The base URL can be overridden via Vite env var.
const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
});

// Add a request interceptor to attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;