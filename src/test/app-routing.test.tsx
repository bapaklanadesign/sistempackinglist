import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each(["/login", "/layanan", "/rute-pengiriman", "/tentang-kami", "/kontak"])("matches the public destination %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).toBe(path);
  });

  it("excludes the login page from indexing", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const match = router.matchRoutes("/login").at(-1);
    const route = match ? router.routesById[match.routeId] : undefined;
    const head = route?.options.head;
    if (!head) throw new Error("Login route must define indexing rules");
    const result = Reflect.apply(head, undefined, [{}]);
    expect(result.meta).toContainEqual({ name: "robots", content: "noindex, nofollow" });
  });

  it("excludes account setup from indexing", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const match = router.matchRoutes("/setup").at(-1);
    const route = match ? router.routesById[match.routeId] : undefined;
    const head = route?.options.head;
    expect(head).toBeTypeOf("function");
    if (!head) throw new Error("Setup route must define indexing rules");
    const result = Reflect.apply(head, undefined, [{}]);
    expect(result.meta).toContainEqual({ name: "robots", content: "noindex, nofollow" });
  });

  it.each(["/dashboard", "/transaksi", "/laporan", "/rekening", "/transfer", "/import", "/audit", "/pengguna", "/profil",
    "/packing-list", "/packing-list/baru", "/packing-list/abc", "/packing-list/abc/edit", "/barang", "/pengirim-penerima", "/kapal-pelabuhan", "/pengiriman", "/manifest", "/cetak-pdf", "/laporan-packing"])("excludes the signed-in page %s from indexing", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const match = router.matchRoutes(path).at(-1);
    const route = match ? router.routesById[match.routeId] : undefined;
    const head = route?.options.head;
    if (!head) throw new Error(`Missing indexing rule for ${path}`);
    const result = Reflect.apply(head, undefined, [{}]);
    expect(result.meta).toContainEqual({ name: "robots", content: "noindex, nofollow" });
  });
});
