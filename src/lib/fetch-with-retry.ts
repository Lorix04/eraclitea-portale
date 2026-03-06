export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  onRetrying?: () => void;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_SECONDS = 3;
const MAX_RETRY_AFTER_SECONDS = 15;

function getRetryDelayMs(response: Response) {
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = Number.parseInt(
    retryAfterHeader ?? String(DEFAULT_RETRY_AFTER_SECONDS),
    10
  );

  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return DEFAULT_RETRY_AFTER_SECONDS * 1000;
  }

  return Math.min(retryAfterSeconds, MAX_RETRY_AFTER_SECONDS) * 1000;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxRetries = DEFAULT_MAX_RETRIES, onRetrying, ...fetchOptions } = options;

  let attempts = 0;

  while (attempts <= maxRetries) {
    const response = await fetch(url, fetchOptions);

    if (response.status === 429) {
      if (attempts >= maxRetries) {
        throw new Error("Troppe richieste. Riprova tra qualche secondo.");
      }

      attempts += 1;
      onRetrying?.();
      await wait(getRetryDelayMs(response));
      continue;
    }

    return response;
  }

  throw new Error("Troppe richieste. Riprova tra qualche secondo.");
}
