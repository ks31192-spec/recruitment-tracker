import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/**
 * URL for a stored upload. `<img>`/`<a>` cannot send an Authorization header,
 * so the token rides along as a query parameter, which the server also accepts.
 */
export function fileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
  const token = localStorage.getItem('token');
  return `/${clean}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export default api;
