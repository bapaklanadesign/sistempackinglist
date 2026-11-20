import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "@/lib/chunk-load-error";

describe("isChunkLoadError", () => {
  it("recognises the Chromium failed dynamic import error", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://x.lovableproject.com/src/routes/index.tsx?tsr-split=component",
        ),
      ),
    ).toBe(true);
  });

  it("recognises the Firefox and Safari variants", () => {
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("does not treat ordinary page errors as download failures", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
