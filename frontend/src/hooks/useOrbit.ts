/** React hook — fetches orbit positions from the backend and manages loading/error state. */

import { useEffect, useState } from "react";
import { fetchOrbit, OrbitData } from "../services/api";

export function useOrbit(centerIso?: string) {
  const [orbit, setOrbit] = useState<OrbitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchOrbit(centerIso)
      .then((data) => {
        if (!cancelled) setOrbit(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centerIso]);

  return { orbit, error, loading };
}
