import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4004/api/v1' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('community_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(r=>r, err => {
  if (err.response?.status === 401 && !String(err.config?.url).includes('/auth/login')) {
    localStorage.removeItem('community_access_token'); localStorage.removeItem('community_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});
export const unwrap = <T,>(response: {data:{data:T}}):T => response.data.data;
export const errorMessage = (e:any) => { const value=e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? 'Something went wrong'; return Array.isArray(value)?value.join(', '):String(value); };
