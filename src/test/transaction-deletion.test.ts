// @vitest-environment node
// Run the actual shipped SQL in an isolated PostgreSQL database, never against user data.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const ids = {
  actor: "00000000-0000-0000-0000-000000000001",
  out: "00000000-0000-0000-0000-000000000002",
  incoming: "00000000-0000-0000-0000-000000000003",
  transfer: "00000000-0000-0000-0000-000000000004",
};
const db = new PGlite();
const migration = readFileSync("supabase/migrations/20261028004609_d664f673-5133-4f0f-b77d-9b960d4b182c.sql", "utf8");
async function identity(role: string, actor = ids.actor) {
  await db.query("select set_config('test.actor', $1, false), set_config('test.role', $2, false)", [actor, role]);
}
async function seed(ledger = "admin1", transfer = false) {
  await db.query("insert into transactions(id, ledger, account_id, tx_date, amount, tx_type, transfer_id) values ($1, $2, '00000000-0000-0000-0000-000000000010', '2026-10-28', 100, $3, $4)", [ids.out, ledger, transfer ? "transfer_out" : "income", transfer ? ids.transfer : null]);
  if (transfer) await db.query("insert into transactions(id, ledger, account_id, tx_date, amount, tx_type, transfer_id) values ($1, $2, '00000000-0000-0000-0000-000000000011', '2026-10-28', 100, 'transfer_in', $3)", [ids.incoming, ledger, ids.transfer]);
}
const remove = (id = ids.out, reason = "Salah input") => db.query("select delete_transaction($1, $2)", [id, reason]);
async function counts() {
  return (await db.query<{ remaining: number; audited: number }>("select (select count(*)::int from transactions) remaining, (select count(*)::int from audit_logs) audited")).rows[0];
}

describe("audited transaction deletion SQL", () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.actor', true), '')::uuid $$;
      create function has_role(uuid, text) returns boolean language sql as $$ select current_setting('test.role', true) = $2 $$;
      create function current_ledger() returns text language sql as $$ select case when current_setting('test.role', true) in ('admin1', 'admin2') then current_setting('test.role', true) end $$;
      create table transactions(id uuid primary key, ledger text, account_id uuid, tx_date date, amount numeric, tx_type text, transfer_id uuid);
      create table audit_logs(transaction_id uuid, ledger text, actor_id uuid, action text, before_data jsonb, reason text, result text);
    `);
    await db.exec(migration);
  }, 30000);
  beforeEach(async () => { await db.exec("truncate transactions, audit_logs"); await identity("admin1"); });
  afterAll(async () => { await db.close(); });
  it("rejects unauthenticated deletion", async () => {
    await seed(); await identity("admin1", "");
    await expect(remove()).rejects.toThrow("Tidak terautentikasi");
    expect(await counts()).toEqual({ remaining: 1, audited: 0 });
  });
  it.each(["admin1", "admin2"])("allows %s to delete its own ledger", async role => {
    await identity(role); await seed(role); await remove();
    expect(await counts()).toEqual({ remaining: 0, audited: 1 });
  });
  it.each(["admin1", "admin2"])("blocks %s from the other ledger", async role => {
    await identity(role); await seed(role === "admin1" ? "admin2" : "admin1", true);
    await expect(remove()).rejects.toThrow("Tidak memiliki akses");
    expect(await counts()).toEqual({ remaining: 2, audited: 0 });
  });
  it.each(["admin1", "admin2"])("allows Super Admin to delete from %s", async ledger => {
    await identity("super_admin"); await seed(ledger); await remove();
    expect(await counts()).toEqual({ remaining: 0, audited: 1 });
  });
  it("requires at least five trimmed reason characters", async () => {
    await seed(); await expect(remove(ids.out, "  abcd  ")).rejects.toThrow("minimal 5 karakter");
    expect(await counts()).toEqual({ remaining: 1, audited: 0 });
    await remove(ids.out, "  abcde  ");
    expect((await db.query<{ reason: string }>("select reason from audit_logs")).rows[0]?.reason).toBe("abcde");
  });
  it.each([ids.out, ids.incoming])("deletes both transfer sides when selecting %s", async id => {
    await seed("admin1", true); await remove(id);
    expect(await counts()).toEqual({ remaining: 0, audited: 2 });
    const rows = (await db.query<{ actor_id: string; amount: string; action: string }>("select actor_id, before_data->>'amount' amount, action from audit_logs")).rows;
    expect(rows).toEqual([{ actor_id: ids.actor, amount: "100", action: "delete" }, { actor_id: ids.actor, amount: "100", action: "delete" }]);
  });
  it("preserves an incomplete transfer without a success audit", async () => {
    await seed("admin1", true); await db.query("delete from transactions where id = $1", [ids.incoming]);
    await expect(remove()).rejects.toThrow("Pasangan transfer tidak lengkap");
    expect(await counts()).toEqual({ remaining: 1, audited: 0 });
  });
  it("preserves mismatched transfer pairs", async () => {
    await seed("admin1", true); await db.query("update transactions set amount = 200 where id = $1", [ids.incoming]);
    await expect(remove()).rejects.toThrow("Pasangan transfer tidak valid");
    expect(await counts()).toEqual({ remaining: 2, audited: 0 });
  });
});