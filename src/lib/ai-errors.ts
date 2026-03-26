/**
 * Parse an OpenRouter error response into a user-friendly Italian message.
 */
export function parseOpenRouterError(
  status: number,
  data: any
): string {
  const errorCode = data?.error?.code || status;
  const rawMessage =
    data?.error?.metadata?.raw || data?.error?.message || "";

  if (
    errorCode === 429 ||
    String(rawMessage).includes("rate-limit") ||
    String(rawMessage).includes("rate_limit")
  ) {
    return "Troppe richieste. Il modello gratuito ha un limite di utilizzo. Riprova tra qualche minuto.";
  }

  if (errorCode === 401 || status === 401) {
    return "Chiave API non valida. Verifica la chiave su openrouter.ai/keys";
  }

  if (
    errorCode === 404 ||
    status === 404 ||
    String(rawMessage).includes("not found")
  ) {
    return "Modello non trovato. Seleziona un modello diverso.";
  }

  if (errorCode === 402 || status === 402) {
    return "Credito insufficiente per questo modello. Scegli un modello gratuito o aggiungi crediti su OpenRouter.";
  }

  if (status === 503 || errorCode === 503) {
    return "Servizio temporaneamente non disponibile. Riprova tra qualche minuto.";
  }

  if (status === 408 || String(rawMessage).includes("timeout")) {
    return "Timeout nella risposta del modello. Riprova o scegli un modello diverso.";
  }

  return `Errore OpenRouter: ${data?.error?.message || rawMessage || `HTTP ${status}`}`;
}
