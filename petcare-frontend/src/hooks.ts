import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useApi<T>(path: string | null, version: unknown = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [local, setLocal] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, version, local]);

  const reload = useCallback(() => setLocal((v) => v + 1), []);
  return { data, setData, error, loading, reload };
}
