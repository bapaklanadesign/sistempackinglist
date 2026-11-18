// Pure Packing List rules shared by pages, PDF output and tests. Mirrors the database functions.
import type { Role } from "./auth";

export const PL_STATUSES = ["draft", "siap_dimuat", "dimuat", "berlayar", "tiba", "selesai", "dibatalkan"] as const;
export type PlStatus = (typeof PL_STATUSES)[number];
export const plStatusLabel: Record<PlStatus, string> = {
  draft: "Draft", siap_dimuat: "Siap Dimuat", dimuat: "Dimuat", berlayar: "Berlayar", tiba: "Tiba", selesai: "Selesai", dibatalkan: "Dibatalkan",
};
export const plStatusTone: Record<PlStatus, string> = {
  draft: "bg-muted text-foreground", siap_dimuat: "bg-warning-soft text-warning", dimuat: "bg-info-soft text-primary",
  berlayar: "bg-info-soft text-primary", tiba: "bg-success-soft text-success", selesai: "bg-success-soft text-success", dibatalkan: "bg-danger-soft text-destructive",
};
export const PL_UNITS = ["koli", "kardus", "karung", "peti", "pallet"] as const;
export const PL_CONDITIONS = ["baik", "rusak_ringan", "rusak_berat", "basah", "kurang"] as const;
export const conditionLabel: Record<string, string> = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat", basah: "Basah", kurang: "Kurang" };
export const unitLabel: Record<string, string> = { koli: "Koli", kardus: "Kardus", karung: "Karung", peti: "Peti", pallet: "Pallet" };

/** Only Super Admin may delete Packing List data; all staff can view, create and edit. */
export const canDeletePl = (role: Role | null | undefined) => role === "super_admin";
export const canEditPl = (role: Role | null | undefined) => role === "super_admin" || role === "admin_packing";

const pos = (n: number | null | undefined) => (n != null && Number.isFinite(n) && n > 0 ? n : 0);
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** Same as SQL pl_item_volume: dimensions (cm, per unit) win over a manually entered total volume. */
export function itemVolume(qty: number, l?: number | null, w?: number | null, h?: number | null, manual?: number | null) {
  if (pos(l) && pos(w) && pos(h)) return round((pos(l) * pos(w) * pos(h)) / 1_000_000 * qty, 4);
  return round(pos(manual), 4);
}

export type PlItemInput = {
  name: string; qty: number | null; unit: string; weight_kg: number | null; length_cm: number | null; width_cm: number | null;
  height_cm: number | null; volume_m3: number | null; value_idr: number | null; notes: string; condition: string;
};
export const emptyItem = (): PlItemInput => ({ name: "", qty: 1, unit: "koli", weight_kg: null, length_cm: null, width_cm: null, height_cm: null, volume_m3: null, value_idr: null, notes: "", condition: "baik" });

/** Totals exactly as save_packing_list stores them: koli = Σqty, weight = Σ(qty × kg/unit), value = Σ line value. */
export function itemTotals(items: PlItemInput[]) {
  let koli = 0, weight = 0, volume = 0, value = 0;
  for (const i of items) {
    const q = pos(i.qty);
    koli += q; weight += q * pos(i.weight_kg); volume += itemVolume(q, i.length_cm, i.width_cm, i.height_cm, i.volume_m3); value += pos(i.value_idr);
  }
  return { count: items.length, koli, weight: round(weight, 2), volume: round(volume, 4), value: round(value, 2) };
}

/** Parse "1,5" or "1.5" into a number; empty → null. */
export function parseNum(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type PlHeaderInput = {
  pl_date: string; shipper_id: string; consignee_id: string; vessel_id: string; voyage_no: string; origin_port_id: string; destination_port_id: string;
  container_no: string; seal_no: string; etd: string; eta: string; notes: string;
};

export function validatePl(h: PlHeaderInput, items: PlItemInput[]): string | null {
  if (!h.shipper_id) return "Pengirim wajib dipilih";
  if (!h.consignee_id) return "Penerima wajib dipilih";
  if (!items.length) return "Minimal satu barang wajib diisi";
  if (items.length > 500) return "Maksimal 500 barang per packing list";
  for (const [i, it] of items.entries()) {
    if (!it.name.trim()) return `Nama barang baris ${i + 1} wajib diisi`;
    if (!it.qty || it.qty <= 0) return `Jumlah barang baris ${i + 1} harus lebih dari 0`;
    if (it.weight_kg != null && it.weight_kg < 0) return `Berat barang baris ${i + 1} tidak valid`;
    for (const d of [it.length_cm, it.width_cm, it.height_cm]) if (d != null && d <= 0) return `Ukuran barang baris ${i + 1} harus lebih dari 0`;
  }
  if (h.etd && h.eta && h.eta < h.etd) return "ETA tidak boleh lebih awal dari ETD";
  if (h.origin_port_id && h.origin_port_id === h.destination_port_id) return "Pelabuhan asal dan tujuan harus berbeda";
  return null;
}

type PlLike = { id: string; status: PlStatus; item_count: number; total_koli: number; total_weight_kg: number; total_volume_m3: number; etd: string | null; vessel_id: string | null; voyage_no: string | null };

/** Dashboard summary. Document and status counts include every Packing List; cargo totals leave out cancelled ones. */
export function plSummary(rows: PlLike[]) {
  const byStatus = Object.fromEntries(PL_STATUSES.map((s) => [s, 0])) as Record<PlStatus, number>;
  let items = 0, koli = 0, weight = 0, volume = 0;
  for (const r of rows) {
    byStatus[r.status]++;
    if (r.status === "dibatalkan") continue;
    items += Number(r.item_count); koli += Number(r.total_koli); weight += Number(r.total_weight_kg); volume += Number(r.total_volume_m3);
  }
  return { documents: rows.length, items, koli, weight: round(weight, 2), volume: round(volume, 4), byStatus };
}

const DEPARTING: PlStatus[] = ["draft", "siap_dimuat", "dimuat"];
/** Upcoming departures: ETD today or later, not yet sailed, grouped per vessel + voyage + ETD. */
export function upcomingDepartures<T extends PlLike>(rows: T[], today: string) {
  const map = new Map<string, { key: string; vessel_id: string | null; voyage_no: string | null; etd: string; pls: T[] }>();
  for (const r of rows) {
    if (!r.etd || r.etd < today || !DEPARTING.includes(r.status)) continue;
    const key = `${r.vessel_id ?? "-"}|${r.voyage_no ?? ""}|${r.etd}`;
    const g = map.get(key) ?? { key, vessel_id: r.vessel_id, voyage_no: r.voyage_no, etd: r.etd, pls: [] };
    g.pls.push(r); map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.etd.localeCompare(b.etd));
}

/** Manifest = all non-cancelled Packing Lists on the same vessel and voyage. */
export function manifestGroups<T extends PlLike>(rows: T[]) {
  const map = new Map<string, { key: string; vessel_id: string; voyage_no: string | null; etd: string | null; pls: T[]; koli: number; weight: number; volume: number }>();
  for (const r of rows) {
    if (!r.vessel_id || r.status === "dibatalkan") continue;
    const key = `${r.vessel_id}|${(r.voyage_no ?? "").trim().toUpperCase()}`;
    const g = map.get(key) ?? { key, vessel_id: r.vessel_id, voyage_no: r.voyage_no, etd: r.etd, pls: [], koli: 0, weight: 0, volume: 0 };
    g.pls.push(r);
    g.koli += Number(r.total_koli); g.weight = round(g.weight + Number(r.total_weight_kg), 2); g.volume = round(g.volume + Number(r.total_volume_m3), 4);
    if (r.etd && (!g.etd || r.etd < g.etd)) g.etd = r.etd;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => (b.etd ?? "").localeCompare(a.etd ?? ""));
}

export const fmtNum = (n: number | string | null | undefined, digits = 2) => Number(n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: digits });
export const plActionLabel: Record<string, string> = { create: "Dibuat", update: "Diubah", delete: "Dihapus", status: "Status diubah" };
export const plEntityLabel: Record<string, string> = { packing_list: "Packing List", pengirim: "Pengirim", penerima: "Penerima", kapal: "Kapal", pelabuhan: "Pelabuhan" };

/** Chart colour per status (tokens in styles.css). */
export const plStatusColor: Record<PlStatus, string> = {
  draft: "var(--viz-st-draft)", siap_dimuat: "var(--viz-st-siap)", dimuat: "var(--viz-st-dimuat)", berlayar: "var(--viz-st-berlayar)",
  tiba: "var(--viz-st-tiba)", selesai: "var(--viz-st-selesai)", dibatalkan: "var(--viz-st-batal)",
};

/** Totals per destination port, largest koli first; cancelled Packing Lists are left out. */
export function destinationTotals<T extends PlLike & { destination?: { name: string | null } | null }>(rows: T[]) {
  const m = new Map<string, { name: string; n: number; koli: number; w: number; v: number }>();
  for (const r of rows) {
    if (r.status === "dibatalkan") continue;
    const name = r.destination?.name ?? "Belum ditentukan";
    const g = m.get(name) ?? { name, n: 0, koli: 0, w: 0, v: 0 };
    g.n++; g.koli += Number(r.total_koli); g.w = round(g.w + Number(r.total_weight_kg), 2); g.v = round(g.v + Number(r.total_volume_m3), 4);
    m.set(name, g);
  }
  return [...m.values()].sort((a, b) => b.koli - a.koli);
}
