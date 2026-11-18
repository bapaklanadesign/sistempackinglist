import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { PlHeaderInput, PlItemInput, PlStatus } from "./packing-logic";

type T = Database["public"]["Tables"];
export type Party = T["pl_parties"]["Row"];
export type Vessel = T["pl_vessels"]["Row"];
export type Port = T["pl_ports"]["Row"];
export type PlItem = T["pl_items"]["Row"];
export type PlHistory = T["pl_status_history"]["Row"];
export type PlActivity = T["pl_activity_logs"]["Row"];
type PartyRef = Pick<Party, "id" | "name" | "company" | "phone" | "address" | "city">;
type PortRef = Pick<Port, "id" | "name" | "city" | "code">;
export type PlRow = T["pl_packing_lists"]["Row"] & {
  shipper: PartyRef | null; consignee: PartyRef | null; vessel: Pick<Vessel, "id" | "name" | "operator" | "call_sign"> | null; origin: PortRef | null; destination: PortRef | null;
};
export type PlDetail = PlRow & { items: PlItem[]; history: PlHistory[] };

// Plain string so supabase-js does not parse the embed at type level; the row shape is pinned by PlRow.
const sel = (s: string): string => s;
export const PL_SELECT = sel(
  "*, shipper:pl_parties!pl_packing_lists_shipper_id_fkey(id,name,company,phone,address,city), consignee:pl_parties!pl_packing_lists_consignee_id_fkey(id,name,company,phone,address,city), vessel:pl_vessels(id,name,operator,call_sign), origin:pl_ports!pl_packing_lists_origin_port_id_fkey(id,name,city,code), destination:pl_ports!pl_packing_lists_destination_port_id_fkey(id,name,city,code)",
);

/** Turns database errors into messages staff understand. */
export function plError(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string };
  if (err.code === "23503") return "Data ini masih dipakai pada Packing List sehingga tidak dapat dihapus.";
  if (err.code === "23514") return "Isian tidak sesuai aturan (cek panjang teks, jumlah, ukuran atau satuan).";
  if (err.code === "42501") return "Anda tidak memiliki izin untuk tindakan ini.";
  return err.message || "Terjadi kesalahan tidak diketahui";
}
function check<D>(r: { data: D | null; error: unknown }): D {
  if (r.error) throw new Error(plError(r.error));
  return r.data as D;
}

export const plListQ = () =>
  queryOptions({
    queryKey: ["pl", "list"],
    queryFn: async () => {
      const out: PlRow[] = [];
      for (let page = 0; page < 50; page++) {
        const rows = check(await supabase.from("pl_packing_lists").select(PL_SELECT).order("pl_date", { ascending: false }).order("created_at", { ascending: false }).range(page * 1000, page * 1000 + 999).returns<PlRow[]>());
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    },
  });

export const plDetailQ = (id: string) =>
  queryOptions({
    queryKey: ["pl", "detail", id],
    queryFn: async (): Promise<PlDetail | null> => {
      const [pl, items, history] = await Promise.all([
        supabase.from("pl_packing_lists").select(PL_SELECT).eq("id", id).returns<PlRow[]>().maybeSingle(),
        supabase.from("pl_items").select("*").eq("packing_list_id", id).order("line_no"),
        supabase.from("pl_status_history").select("*").eq("packing_list_id", id).order("changed_at", { ascending: false }),
      ]);
      const row = check(pl) as PlRow | null;
      if (!row) return null;
      return { ...row, items: check(items), history: check(history) };
    },
  });

export const partiesQ = () => queryOptions({ queryKey: ["pl", "parties"], queryFn: async () => check(await supabase.from("pl_parties").select("*").order("name")) });
export const vesselsQ = () => queryOptions({ queryKey: ["pl", "vessels"], queryFn: async () => check(await supabase.from("pl_vessels").select("*").order("name")) });
export const portsQ = () => queryOptions({ queryKey: ["pl", "ports"], queryFn: async () => check(await supabase.from("pl_ports").select("*").order("name")) });

export type PlItemRow = PlItem & { pl: Pick<PlRow, "id" | "pl_number" | "pl_date" | "status"> | null };
export const plItemsQ = () =>
  queryOptions({
    queryKey: ["pl", "items"],
    queryFn: async () => {
      const out: PlItemRow[] = [];
      for (let page = 0; page < 50; page++) {
        const rows = check(await supabase.from("pl_items").select(sel("*, pl:pl_packing_lists(id,pl_number,pl_date,status)")).order("created_at", { ascending: false }).order("line_no").range(page * 1000, page * 1000 + 999).returns<PlItemRow[]>());
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    },
  });

export const PL_ACTIVITY_PAGE = 25;
export const plActivityQ = (page: number, packingListId?: string) =>
  queryOptions({
    queryKey: ["pl", "activity", page, packingListId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("pl_activity_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (packingListId) q = q.eq("packing_list_id", packingListId);
      const r = await q.range(page * PL_ACTIVITY_PAGE, page * PL_ACTIVITY_PAGE + PL_ACTIVITY_PAGE - 1);
      return { rows: check(r), count: r.count ?? 0 };
    },
  });

/** Creates (id null) or replaces a Packing List with its items through the audited database function. */
export async function savePackingList(id: string | null, header: PlHeaderInput, items: PlItemInput[]) {
  const p_header = Object.fromEntries(Object.entries(header).map(([k, v]) => [k, v.trim()]));
  const p_items = items.map((i) => ({ ...i, name: i.name.trim(), notes: i.notes.trim() }));
  const r = await supabase.rpc("save_packing_list", { p_id: id as string, p_header, p_items });
  return check(r);
}

export async function setPlStatus(id: string, status: PlStatus, note: string) {
  check(await supabase.rpc("set_packing_list_status", { p_id: id, p_status: status, p_note: note.trim() }));
}

type MasterTable = "pl_packing_lists" | "pl_parties" | "pl_vessels" | "pl_ports";
/** Deletes one row; RLS silently skips rows the caller may not delete, so an empty result means no permission. */
export async function deletePlRow(table: MasterTable, id: string) {
  const rows = check(await supabase.from(table).delete().eq("id", id).select("id"));
  if (!rows?.length) throw new Error("Hanya Super Admin yang dapat menghapus data Packing List.");
}

/** Copies a stored item back into form input (used when re-saving schedule changes). */
export const itemToInput = (i: PlItem): PlItemInput => ({
  name: i.name, qty: Number(i.qty), unit: i.unit, weight_kg: Number(i.weight_kg), length_cm: i.length_cm == null ? null : Number(i.length_cm),
  width_cm: i.width_cm == null ? null : Number(i.width_cm), height_cm: i.height_cm == null ? null : Number(i.height_cm),
  volume_m3: i.length_cm && i.width_cm && i.height_cm ? null : Number(i.volume_m3), value_idr: i.value_idr == null ? null : Number(i.value_idr), notes: i.notes ?? "", condition: i.condition,
});
export const plToHeader = (p: PlRow): PlHeaderInput => ({
  pl_date: p.pl_date, shipper_id: p.shipper_id, consignee_id: p.consignee_id, vessel_id: p.vessel_id ?? "", voyage_no: p.voyage_no ?? "", origin_port_id: p.origin_port_id ?? "",
  destination_port_id: p.destination_port_id ?? "", container_no: p.container_no ?? "", seal_no: p.seal_no ?? "", etd: p.etd ?? "", eta: p.eta ?? "", notes: p.notes ?? "",
});
