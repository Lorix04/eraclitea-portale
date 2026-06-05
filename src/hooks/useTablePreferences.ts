"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Minimal column shape the customizer + hook need. Compatible by structural
// typing with ResponsiveTable's Column<T> (which also has key/header/render);
// callers pass a `label` for the customizer display.
export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type TableConfig = { order: string[]; hidden: string[] };

const SAVE_DEBOUNCE_MS = 400;

async function fetchConfig(tableKey: string): Promise<TableConfig | null> {
  const res = await fetch(
    `/api/table-preferences?tableKey=${encodeURIComponent(tableKey)}`
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const cfg = json?.config;
  if (!cfg || typeof cfg !== "object") return null;
  return {
    order: Array.isArray(cfg.order) ? cfg.order.filter((k: unknown) => typeof k === "string") : [],
    hidden: Array.isArray(cfg.hidden) ? cfg.hidden.filter((k: unknown) => typeof k === "string") : [],
  };
}

/**
 * Per-user, per-table column customization.
 *
 * - `columns`: full registry of CUSTOMIZABLE columns, in default order.
 *   Fixed columns (azioni, selezione) must NOT be passed here.
 * - Resolution: start from saved `order` (filtered to known keys), append any
 *   registry columns missing from `order` (new columns appear by default),
 *   then drop keys in `hidden`.
 * - Mutations update local state optimistically and persist (debounced PUT,
 *   immediate DELETE on reset).
 */
export function useTablePreferences<C extends { key: string }>({
  tableKey,
  columns,
}: {
  tableKey: string;
  columns: C[];
}) {
  const queryClient = useQueryClient();
  const registryKeys = useMemo(() => columns.map((c) => c.key), [columns]);
  const registryKey = registryKeys.join("|");

  const { data: savedConfig } = useQuery({
    queryKey: ["table-preferences", tableKey],
    queryFn: () => fetchConfig(tableKey),
    staleTime: 5 * 60 * 1000,
  });

  // Local, optimistic state. Initialized from default once, then hydrated from
  // the saved config when it arrives.
  const [order, setOrder] = useState<string[]>(registryKeys);
  const [hidden, setHidden] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  // Hydrate from saved config once it loads (or fall back to registry order).
  useEffect(() => {
    if (hydratedRef.current) return;
    if (savedConfig === undefined) return; // still loading
    hydratedRef.current = true;
    if (savedConfig) {
      setOrder(savedConfig.order);
      setHidden(savedConfig.hidden);
    }
  }, [savedConfig]);

  // Persist (debounced). Skip until after first hydration to avoid writing the
  // default config on mount.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (nextOrder: string[], nextHidden: string[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const config = { order: nextOrder, hidden: nextHidden };
        void fetch("/api/table-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableKey, config }),
        }).then(() => {
          queryClient.setQueryData(["table-preferences", tableKey], config);
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [tableKey, queryClient]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Effective order: saved order (known keys only) + registry tail (new cols).
  const effectiveOrder = useMemo(() => {
    const known = order.filter((k) => registryKeys.includes(k));
    const missing = registryKeys.filter((k) => !known.includes(k));
    return [...known, ...missing];
  }, [order, registryKeys]);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const columnByKey = useMemo(() => {
    const map = new Map<string, C>();
    for (const c of columns) map.set(c.key, c);
    return map;
  }, [columns]);

  const allColumns = useMemo(
    () => effectiveOrder.map((k) => columnByKey.get(k)).filter(Boolean) as C[],
    [effectiveOrder, columnByKey]
  );

  const orderedVisibleColumns = useMemo(
    () => allColumns.filter((c) => !hiddenSet.has(c.key)),
    [allColumns, hiddenSet]
  );

  const isHidden = useCallback((key: string) => hiddenSet.has(key), [hiddenSet]);

  const setVisibility = useCallback(
    (key: string, visible: boolean) => {
      setHidden((prev) => {
        const next = visible
          ? prev.filter((k) => k !== key)
          : prev.includes(key)
            ? prev
            : [...prev, key];
        persist(effectiveOrder, next);
        return next;
      });
    },
    [effectiveOrder, persist]
  );

  const reorder = useCallback(
    (newOrderKeys: string[]) => {
      // Keep only known keys; append any missing registry keys for safety.
      const known = newOrderKeys.filter((k) => registryKeys.includes(k));
      const missing = registryKeys.filter((k) => !known.includes(k));
      const next = [...known, ...missing];
      setOrder(next);
      persist(next, hidden);
    },
    [registryKeys, hidden, persist]
  );

  const reset = useCallback(() => {
    setOrder(registryKeys);
    setHidden([]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void fetch(
      `/api/table-preferences?tableKey=${encodeURIComponent(tableKey)}`,
      { method: "DELETE" }
    ).then(() => {
      queryClient.setQueryData(["table-preferences", tableKey], null);
    });
  }, [registryKeys, tableKey, queryClient]);

  // Re-hydrate guard: if the registry itself changes identity, leave local
  // state as-is (keys are filtered defensively everywhere above).
  void registryKey;

  return {
    orderedVisibleColumns,
    allColumns,
    isHidden,
    setVisibility,
    reorder,
    reset,
  };
}
