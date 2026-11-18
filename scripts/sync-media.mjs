// Copies every Lovable asset pointer (src/**/*.asset.json) into public/media so
// the static build serves the same files itself (Firebase Hosting has no
// /__l5e asset proxy). Run inside the Lovable sandbox after adding new assets:
//   node scripts/sync-media.mjs            (uses the running dev server proxy)
//   MEDIA_SOURCE=https://<host> node scripts/sync-media.mjs
import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const source = (process.env.MEDIA_SOURCE ?? "http://localhost:8080").replace(/\/$/, "");
const token = process.env.LOVABLE_PREVIEW_TOKEN;

async function* pointers(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* pointers(p);
    else if (e.name.endsWith(".asset.json")) yield p;
  }
}

let fetched = 0, kept = 0;
for await (const file of pointers(join(root, "src"))) {
  const { url, size } = JSON.parse(await readFile(file, "utf8"));
  if (!url?.startsWith("/__l5e/assets-v1/")) continue;
  const out = join(root, "public", "media", url.slice("/__l5e/assets-v1/".length));
  const have = await stat(out).catch(() => null);
  if (have && have.size === size) { kept++; continue; }
  const u = new URL(source + url);
  if (token && !u.hostname.includes("localhost")) u.searchParams.set("__lovable_token", token);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (size && buf.length !== size) throw new Error(`Size mismatch for ${url}: ${buf.length} != ${size}`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  fetched++;
}
console.log(`media synced: ${fetched} downloaded, ${kept} already present`);
