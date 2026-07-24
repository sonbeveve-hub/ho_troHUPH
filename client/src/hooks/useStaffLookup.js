import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useDebounce } from './useDebounce.js';

export function useStaffLookup(name, departmentId) {
  const debouncedName = useDebounce(name, 400);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = debouncedName.trim();
    if (trimmed.length < 2) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ name: trimmed });
    if (departmentId) params.set('department_id', departmentId);

    api
      .get(`/staff/lookup?${params.toString()}`)
      .then((results) => {
        if (!cancelled) setMatches(results);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedName, departmentId]);

  return { matches, loading };
}
