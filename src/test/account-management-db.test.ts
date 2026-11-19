// @vitest-environment node
// Runs the shipped account-management migrations in an isolated PostgreSQL with a minimal
// stand-in for Supabase's auth schema; never touches real accounts.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite({ extensions: { pgcrypto } });
const migrations = ["20261118154418_1332630d-763d-4994-b11a-e8b9739c8c30.sql", "20261118160437_ac60b9a9-95bf-4979-9450-aa373b0e28bb.sql", "20261119174620_2d873889-728e-41f5-a7bd-119c64b6b85d.sql"]
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"));

const base = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema extensions;
create extension pgcrypto with schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.actor', true), '')::uuid $$;
create table auth.users (instance_id uuid, id uuid primary key, aud varchar, role varchar, email varchar, encrypted_password varchar,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token varchar, recovery_token varchar, email_change_token_new varchar, email_change varchar,
  email_change_token_current varchar default '', phone_change varchar default '', phone_change_token varchar default '',
  reauthentication_token varchar default '', is_sso_user boolean not null default false, is_anonymous boolean not null default false,
  banned_until timestamptz, last_sign_in_at timestamptz);
create table auth.identities (id uuid primary key default gen_random_uuid(), provider_id text not null, user_id uuid not null references auth.users on delete cascade,
  identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade);
create table auth.refresh_tokens (id bigserial primary key, user_id varchar, session_id uuid references auth.sessions on delete cascade);
create type public.app_role as enum ('super_admin', 'admin1', 'admin2', 'admin_packing');
create type public.ledger as enum ('admin1', 'admin2');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', email text not null default '');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null, unique (user_id, role));
create table public.audit_logs (id uuid primary key default gen_random_uuid(), transaction_id uuid, ledger public.ledger, actor_id uuid not null,
  action text not null, before_data jsonb, after_data jsonb, reason text, result text not null default 'success', created_at timestamptz not null default now());
create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,'')) on conflict (id) do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
`;

const PW = "Rahasia-12345";
let ids: Record<"sup" | "a1" | "pk", string>;

async function as(id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('test.actor', $1, false)", [id ?? ""]);
  await db.exec("set role authenticated");
}
async function seedAccount(email: string, role: string) {
  await db.exec("reset role");
  const r = await db.query<{ id: string }>("select public._create_staff_account($1, $2, $3, $4::public.app_role) id", [email, PW, email.split("@")[0], role]);
  return r.rows[0]!.id;
}
const one = async <T,>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!;

describe("account management rules", () => {
  beforeAll(async () => { await db.exec(base); for (const m of migrations) await db.exec(m); }, 30000);
  beforeEach(async () => {
    await db.exec("reset role; truncate auth.users cascade; truncate public.audit_logs");
    ids = { sup: await seedAccount("boss@mr.test", "super_admin"), a1: await seedAccount("laporan1@mr.test", "admin1"), pk: await seedAccount("packing@mr.test", "admin_packing") };
  });
  afterAll(async () => { await db.close(); });

  it("stores a bcrypt password that matches and confirms the email", async () => {
    const u = await one<{ ok: boolean; confirmed: boolean }>("select encrypted_password = extensions.crypt($2, encrypted_password) ok, email_confirmed_at is not null confirmed from auth.users where id = $1", [ids.pk, PW]);
    expect(u).toEqual({ ok: true, confirmed: true });
  });

  it.each(["a1", "pk"] as const)("refuses account creation by non-Super Admin (%s)", async (who) => {
    await as(ids[who]);
    await expect(db.query("select admin_create_user('x@mr.test', $1, 'X', 'super_admin')", [PW])).rejects.toThrow("Hanya Super Admin yang dapat mengelola akun");
  });

  it("lets Super Admin create Admin Packing List accounts and logs it", async () => {
    await as(ids.sup);
    await db.query("select admin_create_user('gudang@mr.test', $1, 'Gudang', 'admin_packing')", [PW]);
    await db.exec("reset role");
    expect(await one("select r.role from auth.users u join user_roles r on r.user_id = u.id where u.email = 'gudang@mr.test'")).toEqual({ role: "admin_packing" });
    expect(await one("select count(*)::int n from audit_logs where action = 'user_create'")).toEqual({ n: 1 });
  });

  it("keeps Admin Laporan 1 to one account", async () => {
    await as(ids.sup);
    await expect(db.query("select admin_create_user('lain@mr.test', $1, 'Lain', 'admin1')", [PW])).rejects.toThrow("Akun untuk Admin Laporan 1 sudah ada");
  });

  it("stops admins from raising their own role", async () => {
    await as(ids.a1);
    await expect(db.query("select admin_update_user($1, 'Saya', 'laporan1@mr.test', 'super_admin')", [ids.a1])).rejects.toThrow("Hanya Super Admin");
    await db.exec("reset role");
    expect(await one("select role from user_roles where user_id = $1", [ids.a1])).toEqual({ role: "admin1" });
  });

  it("stops Super Admin from changing own role or deactivating self", async () => {
    await as(ids.sup);
    await expect(db.query("select admin_update_user($1, 'Boss', 'boss@mr.test', 'admin2')", [ids.sup])).rejects.toThrow("tidak dapat mengubah peran akun sendiri");
    await expect(db.query("select admin_set_user_active($1, false)", [ids.sup])).rejects.toThrow("tidak dapat menonaktifkan akun sendiri");
  });

  it("updates name, email and role everywhere", async () => {
    await as(ids.sup);
    await db.query("select admin_update_user($1, 'Budi Laporan', 'BUDI@mr.test', 'admin2')", [ids.a1]);
    await db.exec("reset role");
    const r = await one("select u.email, u.raw_user_meta_data->>'full_name' meta, i.identity_data->>'email' ident, p.full_name, ro.role from auth.users u join auth.identities i on i.user_id = u.id join profiles p on p.id = u.id join user_roles ro on ro.user_id = u.id where u.id = $1", [ids.a1]);
    expect(r).toEqual({ email: "budi@mr.test", meta: "Budi Laporan", ident: "budi@mr.test", full_name: "Budi Laporan", role: "admin2" });
  });

  it("deactivation removes access and sessions; activation restores it", async () => {
    await db.exec("reset role");
    await db.query("insert into auth.sessions (user_id) values ($1)", [ids.pk]);
    await as(ids.sup);
    await db.query("select admin_set_user_active($1, false)", [ids.pk]);
    await as(ids.pk);
    expect(await one("select is_staff() s, has_role($1, 'admin_packing') r", [ids.pk])).toEqual({ s: false, r: false });
    await db.exec("reset role");
    expect(await one("select banned_until > now() banned, (select count(*)::int from auth.sessions where user_id = $1) sessions from auth.users where id = $1", [ids.pk])).toEqual({ banned: true, sessions: 0 });
    await as(ids.sup);
    await db.query("select admin_set_user_active($1, true)", [ids.pk]);
    await as(ids.pk);
    expect(await one("select is_staff() s", [])).toEqual({ s: true });
  });

  it("gives Packing List access only to Super Admin and Admin Packing List", async () => {
    const access = async (id: string) => { await as(id); return (await one<{ s: boolean; l: string | null }>("select is_staff() s, current_ledger()::text l")); };
    expect(await access(ids.sup)).toEqual({ s: true, l: null });
    expect(await access(ids.a1)).toEqual({ s: false, l: "admin1" });
    expect(await access(ids.pk)).toEqual({ s: true, l: null });
  });

  it("resets passwords without logging them", async () => {
    await as(ids.sup);
    await db.query("select admin_reset_password($1, 'Baru-Sekali-999')", [ids.a1]);
    await db.exec("reset role");
    expect(await one("select encrypted_password = extensions.crypt('Baru-Sekali-999', encrypted_password) ok from auth.users where id = $1", [ids.a1])).toEqual({ ok: true });
    const log = await one<{ t: string }>("select coalesce(before_data::text, '') || coalesce(after_data::text, '') t from audit_logs where action = 'user_reset_password'");
    expect(log.t).not.toContain("Baru-Sekali-999");
    await as(ids.sup);
    await expect(db.query("select admin_reset_password($1, 'pendek')", [ids.a1])).rejects.toThrow("Password minimal 10 karakter");
  });

  it("keeps the one-time setup closed once a Super Admin exists", async () => {
    await as(null);
    expect(await one("select setup_status() open")).toEqual({ open: false });
    await expect(db.query("select bootstrap_super_admin('new@mr.test', $1, 'New')", [PW])).rejects.toThrow("Penyiapan awal ditutup");
  });

  it.each(["a1", "pk"] as const)("refuses account deletion by non-Super Admin (%s)", async (who) => {
    await as(ids[who]);
    await expect(db.query("select admin_delete_user($1)", [ids.sup])).rejects.toThrow("Hanya Super Admin");
    await db.exec("reset role");
    expect(await one("select count(*)::int n from auth.users where id = $1", [ids.sup])).toEqual({ n: 1 });
  });

  it("stops Super Admin from deleting own account", async () => {
    await as(ids.sup);
    await expect(db.query("select admin_delete_user($1)", [ids.sup])).rejects.toThrow("tidak dapat menghapus akun sendiri");
  });

  it("deleting an account removes login, sessions, profile and role, and logs it", async () => {
    await db.exec("reset role");
    const s = await one<{ id: string }>("insert into auth.sessions (user_id) values ($1) returning id", [ids.pk]);
    await db.query("insert into auth.refresh_tokens (user_id, session_id) values ($1, $2)", [ids.pk, s.id]);
    await as(ids.sup);
    await db.query("select admin_delete_user($1)", [ids.pk]);
    await db.exec("reset role");
    expect(await one("select (select count(*)::int from auth.users where id = $1) users, (select count(*)::int from auth.identities where user_id = $1) idents, (select count(*)::int from auth.sessions where user_id = $1) sessions, (select count(*)::int from auth.refresh_tokens where user_id = $1::text) tokens, (select count(*)::int from profiles where id = $1) profiles, (select count(*)::int from user_roles where user_id = $1) roles", [ids.pk]))
      .toEqual({ users: 0, idents: 0, sessions: 0, tokens: 0, profiles: 0, roles: 0 });
    expect(await one("select before_data->>'email' email, before_data->>'role' role from audit_logs where action = 'user_delete'")).toEqual({ email: "packing@mr.test", role: "admin_packing" });
  });

  it("lists accounts only for Super Admin", async () => {
    await as(ids.pk);
    await expect(db.query("select * from admin_list_users()")).rejects.toThrow("Hanya Super Admin");
    await as(ids.sup);
    expect((await db.query("select email from admin_list_users()")).rows).toHaveLength(3);
  });
});
