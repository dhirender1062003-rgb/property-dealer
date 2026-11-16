import axios from 'axios';

const BASE_URL = import.meta.env.VITE_DJANGO_API_URL;

// JWT tokens from POST /api/auth/login/. The access token is short-lived;
// the refresh token is used to get a new one without logging in again.
export const tokens = {
  get access() {
    return localStorage.getItem('accessToken');
  },
  get refresh() {
    return localStorage.getItem('refreshToken');
  },
  save({ access, refresh }) {
    if (access) localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

/** Axios client for the dashboard: sends the token and renews it when it expires. */
const adminApi = axios.create({ baseURL: BASE_URL });

adminApi.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing = null;

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried || !tokens.refresh) {
      return Promise.reject(error);
    }
    original._retried = true;
    refreshing ??= axios
      .post(`${BASE_URL}/auth/refresh/`, { refresh: tokens.refresh })
      .then(({ data }) => {
        tokens.save(data);
        return data.access;
      })
      .finally(() => {
        refreshing = null;
      });
    try {
      const access = await refreshing;
      original.headers.Authorization = `Bearer ${access}`;
      return adminApi(original);
    } catch {
      tokens.clear();
      window.dispatchEvent(new Event('dashboard:logout'));
      return Promise.reject(error);
    }
  },
);

/** Readable message from a DRF error response. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';
  if (error.response.status === 403) return data?.detail || 'You do not have permission to do this.';
  if (typeof data === 'string' || !data) return fallback;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return [].concat(data.non_field_errors).join(' ');
  const first = Object.entries(data)[0];
  return first ? `${first[0].replace(/_/g, ' ')}: ${[].concat(first[1]).join(' ')}` : fallback;
}

/** Field errors from a DRF 400 response, e.g. { phone: 'Enter a valid…' }. */
export function fieldErrors(error) {
  const data = error?.response?.status === 400 ? error.response.data : null;
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [].concat(v).join(' ')]));
}

export default adminApi;
