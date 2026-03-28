/** React hook — fetches Sentinel-2 acquisition index from the backend. */

import { useEffect, useState } from "react";
import { fetchAcquisitions, AcquisitionsData } from "../services/api";

export function useAcquisitions(start?: string, end?: string) {
  const [data, setData] = useState<AcquisitionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAcquisitions(start, end)
      .then((result) => {
        if (!cancelled) setData(result);
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
  }, [start, end]);

  return { data, error, loading };
}
