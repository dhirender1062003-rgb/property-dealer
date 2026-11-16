import { useCallback, useEffect, useState } from 'react';
import { fetchProperties, fetchProperty } from '../services/properties';

// Generic loader: runs `loader` whenever `key` changes and tracks loading/error.
function useAsync(loader, key) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((error) => active && setState({ loading: false, error, data: null }));
    return () => {
      active = false;
    };
    // `loader` is recreated every render; `key` captures its real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

/** List of properties for the given filter params. */
export function useProperties(params) {
  const key = JSON.stringify(params);
  return useAsync(() => fetchProperties(JSON.parse(key)), key);
}

/** A single property by slug. */
export function useProperty(slug) {
  return useAsync(() => fetchProperty(slug), slug);
}
