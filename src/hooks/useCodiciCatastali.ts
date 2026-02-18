import { useEffect, useState } from "react";

type ComuneData = { nome: string; provincia: string; cap: string };
type CodiciMap = Record<string, ComuneData>;

let cachedData: CodiciMap | null = null;
let loadingPromise: Promise<CodiciMap> | null = null;

async function loadCodici(): Promise<CodiciMap> {
  if (cachedData) return cachedData;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/data/codici-catastali.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load codici catastali");
      return res.json();
    })
    .then((data) => {
      cachedData = data;
      return data;
    });

  return loadingPromise;
}

export function useCodiciCatastali() {
  const [data, setData] = useState<CodiciMap | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    loadCodici()
      .then((loaded) => {
        setData(loaded);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const lookupComune = (codiceCatastale: string): ComuneData | null => {
    if (!data) return null;
    return data[codiceCatastale] ?? null;
  };

  const searchComuni = (
    query: string,
    limit = 20
  ): Array<ComuneData & { codice: string }> => {
    if (!data || !query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: Array<ComuneData & { codice: string }> = [];

    for (const [codice, comune] of Object.entries(data)) {
      if (comune.nome.toLowerCase().startsWith(q)) {
        results.push({ ...comune, codice });
        if (results.length >= limit) break;
      }
    }

    if (results.length < limit) {
      for (const [codice, comune] of Object.entries(data)) {
        const lowerName = comune.nome.toLowerCase();
        if (!lowerName.startsWith(q) && lowerName.includes(q)) {
          results.push({ ...comune, codice });
          if (results.length >= limit) break;
        }
      }
    }

    return results;
  };

  return { data, loading, lookupComune, searchComuni };
}
