import axios from 'axios';
import { syncQueue, isOnline } from './offline';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Try sync whenever we regain connectivity
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue(api).then((r) => {
      if (r.synced > 0) {
        console.log(`Synced ${r.synced} offline item(s)`);
      }
    });
  });
}

export { isOnline };
export default api;
