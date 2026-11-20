/**
 * Detects errors raised when the browser cannot download a lazily loaded
 * page module (stale tab after a new deploy/restart, flaky connection).
 * Messages differ per browser, so match the known variants.
 */
const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite CSS preload
  /loading (css )?chunk [\w-]+ failed/i, // generic bundlers
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "ChunkLoadError") return true;
  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(message));
}
