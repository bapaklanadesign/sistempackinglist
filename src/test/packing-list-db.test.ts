// @vitest-environment node
// Runs the live Packing List SQL plus the shipped permission migration in an isolated PostgreSQL; never touches user data.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const base = readFileSync("src/test/fixtures/packing-list-base.sql", "utf8");
const migration = readFileSync("supabase/migrations/20261114101840_8d23bb6b-fa5d-42f3-9eb8-e7db8ee29f53.sql", "utf8");
const actor = "00000000-0000-0000-0000-0000000000a1";
const ids = { shipper: "00000000-0000-0000-0000-000000000101", consignee: "00000000-0000-0000-0000-000000000102", vessel: "00000000-0000-0000-0000-000000000103" };

/** Acts as a signed-in user with the given role, subject to row level security like the Data API. */
async function as(role: "super_admin" | "admin1" | "admin2" | "admin_packing" | "none") {
  await db.exec("reset role");
  await db.query("select set_config('test.actor', $1, false), set_config('test.role', $2, false)", [actor, role === "none" ? "" : role]);
  await db.exec("set role authenticated");
}
const header = (extra: Record<string, string> = {}) => ({ pl_date: "2026-11-14", shipper_id: ids.shipper, consignee_id: ids.consignee, vessel_id: ids.vessel, voyage_no: "12", etd: "2026-11-20", eta: "2026-11-27", ...extra });
const items = [
  { name: "Kardus pakaian", qty: 10, unit: "kardus", weight_kg: 12.5, length_cm: 50, width_cm: 40, height_cm: 30, value_idr: 500000, condition: "baik" },
  { name: "Mesin jahit", qty: 2, unit: "peti", weight_kg: 40, volume_m3: 0.8, condition: "baik" },
];
async function save(id: string | null = null, h = header(), it: unknown[] = items) {
  const r = await db.query<{ id: string; pl_number: string; total_koli: string; total_weight_kg: string; total_volume_m3: string; total_value: string; item_count: number }>(
    "select (r).* from (select save_packing_list($1, $2::jsonb, $3::jsonb) r) s", [id, JSON.stringify(h), JSON.stringify(it)]);
  return r.rows[0]!;
}
const count = async (sql: string) => Number((await db.query<{ n: number }>(`select count(*)::int n from ${sql}`)).rows[0]?.n);

describe("Packing List database rules", () => {
  beforeAll(async () => { await db.exec(base); await db.exec(migration); }, 30000);
  beforeEach(async () => {
    await db.exec("reset role; truncate pl_activity_logs, pl_status_history, pl_items, pl_packing_lists, pl_parties, pl_vessels, pl_ports cascade");
    await db.query("insert into pl_parties(id, kind, name) values ($1, 'pengirim', 'Toko Kiki'), ($2, 'penerima', 'Moch Seli')", [ids.shipper, ids.consignee]);
    await db.query("insert into pl_vessels(id, name) values ($1, 'KM Dharma Kencana')", [ids.vessel]);
    await db.exec("truncate pl_activity_logs");
  });
  afterAll(async () => { await db.close(); });

  it.each(["super_admin", "admin_packing"] as const)("lets %s create a Packing List with correct totals", async (role) => {
    await as(role);
    const pl = await save();
    expect(pl.pl_number).toMatch(/^PL-202611-\d{5}$/);
    // koli 10 + 2; weight 10×12.5 + 2×40; volume 0.5×0.4×0.3×10 + 0.8 manual; value 500000
    expect([Number(pl.total_koli), Number(pl.total_weight_kg), Number(pl.total_volume_m3), Number(pl.total_value), pl.item_count]).toEqual([12, 205, 1.4, 500000, 2]);
    expect(await count("pl_items")).toBe(2);
    expect((await db.query("select to_status from pl_status_history")).rows).toEqual([{ to_status: "draft" }]);
  });

  it("rejects users without a Packing List role", async () => {
    await as("none");
    await expect(save()).rejects.toThrow("Tidak memiliki akses Packing List");
  });

  it.each(["admin1", "admin2"] as const)("keeps Admin Laporan %s out of Packing List data", async (role) => {
    await as("admin_packing");
    await save();
    await as(role);
    await expect(save()).rejects.toThrow("Tidak memiliki akses Packing List");
    for (const t of ["pl_packing_lists", "pl_items", "pl_parties", "pl_vessels", "pl_status_history", "pl_activity_logs"]) expect(await count(t)).toBe(0);
    await expect(db.exec("insert into pl_ports(name) values ('Makassar')")).rejects.toThrow(/row-level security/);
  });

  it("lets Admin Packing List edit: saving again replaces the items and logs an update", async () => {
    await as("admin_packing");
    const pl = await save();
    const edited = await save(pl.id, header({ voyage_no: "13" }), [items[0]]);
    expect([edited.pl_number, edited.item_count, Number(edited.total_koli)]).toEqual([pl.pl_number, 1, 10]);
    expect(await count("pl_items")).toBe(1);
    expect((await db.query("select action from pl_activity_logs where entity = 'packing_list' order by created_at")).rows.map((r) => (r as { action: string }).action)).toEqual(["create", "update"]);
  });

  it("stores status changes with history and requires a reason to cancel", async () => {
    await as("admin_packing");
    const pl = await save();
    await db.query("select set_packing_list_status($1, 'siap_dimuat', 'Barang lengkap')", [pl.id]);
    await expect(db.query("select set_packing_list_status($1, 'dibatalkan', 'no')", [pl.id])).rejects.toThrow("Alasan pembatalan wajib diisi");
    expect((await db.query("select status from pl_packing_lists")).rows).toEqual([{ status: "siap_dimuat" }]);
    expect((await db.query("select from_status, to_status, note from pl_status_history where from_status is not null")).rows).toEqual([{ from_status: "draft", to_status: "siap_dimuat", note: "Barang lengkap" }]);
    expect(await count("pl_activity_logs where action = 'status'")).toBe(1);
  });

  it("blocks Admin Packing List from deleting Packing Lists, contacts, ships and ports", async () => {
    await as("admin_packing");
    await save();
    for (const t of ["pl_packing_lists", "pl_vessels", "pl_parties", "pl_ports"]) await db.exec(`delete from ${t}`);
    await db.exec("reset role");
    expect([await count("pl_packing_lists"), await count("pl_items"), await count("pl_vessels"), await count("pl_parties")]).toEqual([1, 2, 1, 2]);
  });

  it("lets Admin Packing List add and edit contacts, ships and ports", async () => {
    await as("admin_packing");
    await db.exec("insert into pl_ports(name, city) values ('Tanjung Perak', 'Surabaya')");
    await db.query("update pl_vessels set operator = 'PELNI' where id = $1", [ids.vessel]);
    await db.exec("reset role");
    expect([await count("pl_ports"), await count("pl_vessels where operator = 'PELNI'")]).toEqual([1, 1]);
  });

  it("lets only Super Admin delete, removing items and logging the deletion", async () => {
    await as("admin_packing");
    const pl = await save();
    await as("super_admin");
    const del = await db.query("delete from pl_packing_lists where id = $1 returning id", [pl.id]);
    expect(del.rows).toHaveLength(1);
    await db.exec("reset role");
    expect([await count("pl_packing_lists"), await count("pl_items"), await count("pl_activity_logs where action = 'delete' and entity = 'packing_list'")]).toEqual([0, 0, 1]);
  });

  it("keeps contacts that are still used by a Packing List", async () => {
    await as("super_admin");
    await save();
    await expect(db.query("delete from pl_parties where id = $1", [ids.shipper])).rejects.toThrow(/foreign key/);
  });
});
