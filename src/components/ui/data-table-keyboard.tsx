"use client";

import { useEffect, useRef, useState } from "react";

interface DataTableKeyboardProps<T> {
  rows: T[];
  onRowSelect?: (row: T) => void;
  onRowAction?: (row: T, action: string) => void;
}

export function useDataTableKeyboard<T>({
  rows,
  onRowSelect,
  onRowAction,
}: DataTableKeyboardProps<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!tableRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((index) => Math.min(index + 1, rows.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((index) => Math.max(index - 1, 0));
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (focusedIndex >= 0 && onRowSelect) {
            onRowSelect(rows[focusedIndex]);
          }
          break;
        case "Delete":
          event.preventDefault();
          if (focusedIndex >= 0 && onRowAction) {
            onRowAction(rows[focusedIndex], "delete");
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, onRowAction, onRowSelect, rows]);

  return { tableRef, focusedIndex, setFocusedIndex };
}
