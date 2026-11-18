// Which module and pages each role may open. The database (RLS + RPC checks) is the
// real boundary; this keeps menus, redirects and direct URLs consistent with it.
import type { Role } from "./auth";

export type Area = "super" | "bookkeeping" | "ledger" | "packing" | "common";

/** Pages by area. "ledger" pages need an own ledger (Admin Laporan 1/2 only). */
const AREAS: Record<Exclude<Area, "common">, string[]> = {
  super: ["/dashboard", "/rekening", "/audit", "/pengguna"],
  bookkeeping: ["/dashboard-pembukuan", "/transaksi", "/laporan"],
  ledger: ["/transfer", "/import"],
  packing: ["/dashboard-packing", "/packing-list", "/barang", "/pengirim-penerima", "/kapal-pelabuhan", "/pengiriman", "/manifest", "/cetak-pdf", "/laporan-packing"],
};

export const canBookkeeping = (r: Role | null | undefined) => r === "super_admin" || r === "admin1" || r === "admin2";
export const canPacking = (r: Role | null | undefined) => r === "super_admin" || r === "admin_packing";
export const canManageUsers = (r: Role | null | undefined) => r === "super_admin";

export function areaOf(path: string): Area {
  const p = path.replace(/\/+$/, "") || "/";
  for (const [area, list] of Object.entries(AREAS) as [Area, string[]][]) {
    if (list.some((base) => p === base || p.startsWith(`${base}/`))) return area;
  }
  return "common";
}

export function canOpen(role: Role | null | undefined, path: string): boolean {
  if (!role) return false;
  switch (areaOf(path)) {
    case "super": return role === "super_admin";
    case "bookkeeping": return canBookkeeping(role);
    case "ledger": return role === "admin1" || role === "admin2";
    case "packing": return canPacking(role);
    default: return true;
  }
}

/** Where each role lands after login (and when opening a page it may not see). */
export function homeFor(role: Role | null | undefined): "/dashboard" | "/dashboard-pembukuan" | "/dashboard-packing" | "/profil" {
  if (role === "super_admin") return "/dashboard";
  if (role === "admin1" || role === "admin2") return "/dashboard-pembukuan";
  if (role === "admin_packing") return "/dashboard-packing";
  return "/profil";
}
