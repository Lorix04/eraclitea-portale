"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

interface UseFetchOptions<TData = unknown> {
  url: string;
  enabled?: boolean;
  dependencies?: readonly unknown[];
  transform?: (data: unknown) => TData;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  retrying: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Si e verificato un errore. Riprova.";
}

export function useFetchWithRetry<T>({
  url,
  enabled = true,
  dependencies = [],
  transform,
}: UseFetchOptions<T>): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const transformData = useMemo(
    () => transform ?? ((payload: unknown) => payload as T),
    [transform]
  );
  const dependenciesKey = useMemo(() => JSON.stringify(dependencies), [dependencies]);

  const execute = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setRetrying(false);
      return;
    }

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    setError(null);
    setRetrying(false);

    try {
      const response = await fetchWithRetry(url, {
        onRetrying: () => setRetrying(true),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Si e verificato un errore. Riprova."
        );
      }

      const payload = await response.json().catch(() => null);
      setData(transformData(payload));
      hasLoadedRef.current = true;
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [enabled, transformData, url]);

  useEffect(() => {
    void execute();
  }, [dependenciesKey, execute]);

  return {
    data,
    loading,
    retrying,
    error,
    refetch: execute,
  };
}
