import { mkdir, writeFile } from "fs/promises";
import path from "path";

type ComuneSource = {
  codiceCatastale?: string;
  nome?: string;
  sigla?: string;
  cap?: string[] | string;
};

async function main() {
  const sourceUrl =
    "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Download fallito: ${response.status}`);
  }

  const comuni = (await response.json()) as ComuneSource[];
  const result: Record<string, { nome: string; provincia: string; cap: string }> =
    {};

  for (const comune of comuni) {
    const codice = (comune.codiceCatastale ?? "").trim().toUpperCase();
    if (!codice) continue;

    const cap = Array.isArray(comune.cap)
      ? comune.cap[0] ?? ""
      : (comune.cap ?? "");

    result[codice] = {
      nome: comune.nome ?? "",
      provincia: comune.sigla ?? "",
      cap,
    };
  }

  const outputDir = path.join(process.cwd(), "public", "data");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "codici-catastali.json");
  await writeFile(outputPath, JSON.stringify(result), "utf8");
  console.log(`Generati ${Object.keys(result).length} comuni in ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
