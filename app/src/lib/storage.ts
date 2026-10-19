// Browser storage is optional, untrusted and never a prerequisite for financial operations.
export function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Privacy mode / quota: continue without a cache. */
  }
}
export function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Confirmed operations must still navigate to their receipt. */
  }
}
