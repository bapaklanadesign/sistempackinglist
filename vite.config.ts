// Plain Vite SPA build (no SSR server, no Nitro). Output: dist/index.html + dist/assets/*,
// deployable as static files (Firebase Hosting rewrites every path to /index.html).
import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const LOVABLE_ASSET_PREFIX = "/__l5e/assets-v1/";
const MEDIA_PREFIX = "/media/";

/**
 * Asset pointers (*.asset.json) reference Lovable's /__l5e asset proxy, which static
 * hosts do not have. The files are mirrored in public/media (scripts/sync-media.mjs),
 * so rewrite pointer URLs to that copy and fail the build if a file is missing.
 */
function selfHostedMedia(): Plugin {
  return {
    name: "self-hosted-media",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0]!.endsWith(".asset.json")) return null;
      const url = (JSON.parse(code) as { url?: string }).url;
      if (!url?.startsWith(LOVABLE_ASSET_PREFIX)) return null;
      const rel = url.slice(LOVABLE_ASSET_PREFIX.length);
      if (!existsSync(path.resolve(__dirname, "public/media", rel))) {
        this.error(`Media file missing for ${path.relative(__dirname, id)}. Run: node scripts/sync-media.mjs`);
      }
      return { code: code.split(LOVABLE_ASSET_PREFIX).join(MEDIA_PREFIX), map: null };
    },
  };
}

const sandbox = process.env["LOVABLE_SANDBOX"] === "1" || !!process.env["DEV_SERVER__PROJECT_PATH"];

export default defineConfig({
  base: "/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    selfHostedMedia(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-router", "@tanstack/react-query"],
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: sandbox,
    ...(sandbox ? { watch: { ignored: ["**/.workspace/**", "**/.agents/**", "**/.claude/**", "**/.lovable/**", "**/.tanstack/tmp/**"] }, hmr: { overlay: false } } : {}),
  },
  preview: { host: "::", port: 4173 },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
