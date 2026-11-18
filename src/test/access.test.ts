import { describe, expect, it } from "vitest";
import { canOpen, homeFor } from "@/lib/access";

describe("role landing pages", () => {
  it.each([["super_admin", "/dashboard"], ["admin1", "/dashboard-pembukuan"], ["admin2", "/dashboard-pembukuan"], ["admin_packing", "/dashboard-packing"]] as const)("sends %s to %s after login", (role, home) => {
    expect(homeFor(role)).toBe(home);
  });
});

const bookkeeping = ["/dashboard-pembukuan", "/transaksi", "/laporan"];
const packing = ["/dashboard-packing", "/packing-list", "/packing-list/abc/edit", "/barang", "/pengirim-penerima", "/kapal-pelabuhan", "/pengiriman", "/manifest", "/cetak-pdf", "/laporan-packing"];
const superOnly = ["/dashboard", "/pengguna", "/audit", "/rekening"];

describe("page access by role", () => {
  it("lets Super Admin open every module", () => {
    for (const p of [...bookkeeping, ...packing, ...superOnly, "/profil"]) expect(canOpen("super_admin", p)).toBe(true);
  });
  it.each(["admin1", "admin2"] as const)("keeps %s in Pembukuan only", (role) => {
    for (const p of [...bookkeeping, "/transfer", "/import", "/profil"]) expect(canOpen(role, p)).toBe(true);
    for (const p of [...packing, ...superOnly]) expect(canOpen(role, p)).toBe(false);
  });
  it("keeps Admin Packing List in Packing List only", () => {
    for (const p of [...packing, "/profil"]) expect(canOpen("admin_packing", p)).toBe(true);
    for (const p of [...bookkeeping, "/transfer", "/import", ...superOnly]) expect(canOpen("admin_packing", p)).toBe(false);
  });
  it("blocks signed-in users without a role", () => {
    expect(canOpen(null, "/profil")).toBe(false);
  });
});
