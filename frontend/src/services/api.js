import axios from 'axios';

// Axios client for the public website. It never sends a login token, so the
// public site always shows exactly what visitors see, even when a staff
// member is signed in to the dashboard (which uses dashboard/adminApi.js).
// The base URL comes from VITE_DJANGO_API_URL in frontend/.env.
const api = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_API_URL,
});

export default api;
