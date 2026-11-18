import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { siteNavigation } from "@/components/site/site-chrome";

describe("Public site navigation", () => {
  it("offers the six agreed menu items in order", () => {
    expect(siteNavigation.map(n => n.label)).toEqual(["Beranda", "Layanan", "Rute Pengiriman", "Tentang Kami", "Kontak", "Login"]);
  });
  it.each(siteNavigation.map(n => [n.label, n.to]))("links %s to an existing page (%s)", (_label, to) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(to).at(-1)?.routeId).toBe(to === "/" ? "/" : to);
  });
});
