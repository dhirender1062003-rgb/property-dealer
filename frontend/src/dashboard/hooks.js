import { useCallback, useEffect, useState } from 'react';
import adminApi from './adminApi';

/**
 * Load data for a page. `key` is any value that should trigger a reload when
 * it changes (e.g. the query string). Returns { data, loading, error, reload, setData }.
 */
export function useResource(loader, key) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((updater) => setState((s) => ({
    ...s, data: typeof updater === 'function' ? updater(s.data) : updater,
  })), []);
  return { ...state, reload, setData };
}

/** GET a URL with query params; reloads when the params change. */
export function useApiGet(url, params = {}) {
  const key = `${url}?${new URLSearchParams(params)}`;
  return useResource(() => adminApi.get(url, { params }).then((r) => r.data), key);
}

export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Admins, dealers and staff — for "Assigned to" dropdowns. */
export function useTeam() {
  const { data } = useApiGet('/team/');
  return data ?? [];
}
