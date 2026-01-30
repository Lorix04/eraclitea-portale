export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
      if (duration > 1000) {
        console.warn(`[SLOW] ${name} took ${duration.toFixed(2)}ms`);
      }
    }
  }
}
