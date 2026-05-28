"use client";

import { useId, useMemo } from "react";
import { useCodiciCatastali } from "@/hooks/useCodiciCatastali";

export type ComuneMatch = { nome: string; provincia: string; cap: string };

type ComuneAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called when the typed/selected value exactly matches a known comune. */
  onComuneSelected?: (comune: ComuneMatch) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
};

const stripProvincia = (value: string) =>
  value.replace(/\s*\([A-Za-z]{2}\)\s*$/, "").trim();

export function ComuneAutocomplete({
  value,
  onChange,
  onComuneSelected,
  placeholder,
  disabled,
  hasError,
  className,
}: ComuneAutocompleteProps) {
  // useId may contain colons — sanitize so it is a valid `list` target
  const listId = `comune-${useId().replace(/:/g, "")}`;
  const { searchComuni } = useCodiciCatastali();

  const suggestions = useMemo(() => {
    const query = stripProvincia(value);
    if (query.length < 2) return [];
    return searchComuni(query, 30);
  }, [value, searchComuni]);

  const handleChange = (raw: string) => {
    onChange(raw);
    if (!onComuneSelected) return;

    const match = raw.match(/^(.*?)\s*\(([A-Za-z]{2})\)\s*$/);
    const name = (match?.[1] ?? raw).trim().toLowerCase();
    const provincia = match?.[2]?.toUpperCase();
    if (!name) return;

    const candidates = searchComuni(name, 50).filter(
      (c) => c.nome.toLowerCase() === name
    );
    if (candidates.length === 0) return;

    const exact = provincia
      ? candidates.find((c) => c.provincia.toUpperCase() === provincia) ??
        candidates[0]
      : candidates[0];
    if (exact) onComuneSelected(exact);
  };

  return (
    <>
      <input
        list={listId}
        className={
          className ??
          `w-full rounded-md border bg-background px-3 py-2 text-sm ${
            hasError ? "border-red-500 focus-visible:outline-red-500" : ""
          }`
        }
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((comune) => (
          <option
            key={comune.codice}
            value={`${comune.nome} (${comune.provincia})`}
          />
        ))}
      </datalist>
    </>
  );
}
