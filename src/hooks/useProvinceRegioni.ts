import { useEffect, useState } from "react";

export type ProvinciaRegione = {
  sigla: string;
  nome: string;
  regione: string;
};

type ProvinceRegioniData = {
  regioni: string[];
  province: ProvinciaRegione[];
};

let cachedData: ProvinceRegioniData | null = null;
let loadingPromise: Promise<ProvinceRegioniData> | null = null;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitWords(value: string) {
  return value.split(/[\s'’-]+/).filter(Boolean);
}

function matchesFromWordStart(value: string, query: string) {
  const normalizedValue = normalizeText(value);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const words = splitWords(normalizedValue);
  const queryWords = splitWords(normalizedQuery);
  if (queryWords.length === 0) return true;

  return queryWords.every((queryWord) =>
    words.some((word) => word.startsWith(queryWord))
  );
}

async function loadProvinceRegioni(): Promise<ProvinceRegioniData> {
  if (cachedData) return cachedData;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/data/province-regioni.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load province/regioni");
      return res.json();
    })
    .then((data: ProvinceRegioniData) => {
      cachedData = {
        regioni: Array.isArray(data?.regioni) ? data.regioni : [],
        province: Array.isArray(data?.province) ? data.province : [],
      };
      return cachedData;
    });

  return loadingPromise;
}

export function useProvinceRegioni() {
  const [province, setProvince] = useState<ProvinciaRegione[]>(
    cachedData?.province ?? []
  );
  const [regioni, setRegioni] = useState<string[]>(cachedData?.regioni ?? []);
  const [isLoading, setIsLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setProvince(cachedData.province);
      setRegioni(cachedData.regioni);
      setIsLoading(false);
      return;
    }

    loadProvinceRegioni()
      .then((loaded) => {
        setProvince(loaded.province);
        setRegioni(loaded.regioni);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const filterProvince = (query: string) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return province;

    const compactQuery = normalizedQuery.replace(/\s+/g, "");
    return province.filter((provincia) => {
      const siglaMatch = provincia.sigla.toLowerCase().startsWith(compactQuery);
      const nomeMatch = matchesFromWordStart(provincia.nome, normalizedQuery);
      return siglaMatch || nomeMatch;
    });
  };

  const filterRegioni = (query: string) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return regioni;
    return regioni.filter((regione) =>
      matchesFromWordStart(regione, normalizedQuery)
    );
  };

  const getRegioneByProvincia = (siglaONome: string): string | null => {
    const normalizedInput = normalizeText(siglaONome);
    if (!normalizedInput) return null;

    const bySigla = province.find(
      (provincia) => provincia.sigla.toLowerCase() === normalizedInput
    );
    if (bySigla) return bySigla.regione;

    const byNomeExact = province.find(
      (provincia) => normalizeText(provincia.nome) === normalizedInput
    );
    if (byNomeExact) return byNomeExact.regione;

    const byNomeWordStart = province.filter((provincia) =>
      matchesFromWordStart(provincia.nome, normalizedInput)
    );
    if (byNomeWordStart.length === 1) {
      return byNomeWordStart[0].regione;
    }

    return null;
  };

  return {
    province,
    regioni,
    isLoading,
    filterProvince,
    filterRegioni,
    getRegioneByProvincia,
  };
}
