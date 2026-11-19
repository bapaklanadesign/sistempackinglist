// Account administration without a server runtime: the browser calls audited
// SECURITY DEFINER database functions with the publishable key. Permission checks
// (Super Admin only, one-time setup, one Admin 1/Admin 2 account) run in the database.
import { supabase } from "@/integrations/supabase/client";

export type NewUserRole = "super_admin" | "admin1" | "admin2" | "admin_packing";
export type NewUser = { email: string; password: string; fullName: string; role: NewUserRole };

/** Same rules the database enforces; checked first so the form answers instantly. */
export function validateNewUser(d: unknown): NewUser {
  const o = (d ?? {}) as Record<string, unknown>;
  const email = String(o["email"] ?? "").trim().toLowerCase();
  const password = String(o["password"] ?? "");
  const fullName = String(o["fullName"] ?? "").trim().slice(0, 80);
  const role = String(o["role"] ?? "") as NewUserRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Email tidak valid");
  if (password.length < 10 || password.length > 72) throw new Error("Password minimal 10 karakter");
  if (!fullName) throw new Error("Nama wajib diisi");
  if (!["super_admin", "admin1", "admin2", "admin_packing"].includes(role)) throw new Error("Peran tidak valid");
  return { email, password, fullName, role };
}

/** Super Admin creates an account and assigns its role. */
export async function createUser(input: NewUser) {
  const u = validateNewUser(input);
  const { data, error } = await supabase.rpc("admin_create_user", {
    _email: u.email, _password: u.password, _full_name: u.fullName, _role: u.role,
  });
  if (error) throw new Error(error.message);
  return { id: data as string };
}

/** Whether the one-time initial Super Admin setup is still open. */
export async function setupStatus() {
  const { data, error } = await supabase.rpc("setup_status");
  if (error) throw new Error("Tidak dapat memeriksa status: " + error.message);
  return { open: data === true };
}

/** One-time bootstrap: creates the first Super Admin only while none exists. */
export async function bootstrapSuperAdmin(input: Omit<NewUser, "role">) {
  const u = validateNewUser({ ...input, role: "super_admin" });
  const { data, error } = await supabase.rpc("bootstrap_super_admin", {
    _email: u.email, _password: u.password, _full_name: u.fullName,
  });
  if (error) throw new Error(error.message);
  return { id: data as string };
}

export type ManagedUser = { id: string; email: string; full_name: string; role: NewUserRole | null; active: boolean; last_sign_in_at: string | null; created_at: string };

/** Super Admin: every account with role and active status. */
export async function listUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagedUser[];
}

/** Super Admin: change name, email and role (own role cannot be changed). */
export async function updateUser(id: string, input: { fullName: string; email: string; role: NewUserRole }) {
  const u = validateNewUser({ ...input, password: "x".repeat(10) });
  const { error } = await supabase.rpc("admin_update_user", { _user_id: id, _full_name: u.fullName, _email: u.email, _role: u.role });
  if (error) throw new Error(error.message);
}

/** Super Admin: deactivate (blocks sign-in, ends sessions) or reactivate an account. */
export async function setUserActive(id: string, active: boolean) {
  const { error } = await supabase.rpc("admin_set_user_active", { _user_id: id, _active: active });
  if (error) throw new Error(error.message);
}

/** Super Admin: set a new password for an account. */
export async function resetUserPassword(id: string, password: string) {
  if (password.length < 10 || password.length > 72) throw new Error("Password minimal 10 karakter");
  const { error } = await supabase.rpc("admin_reset_password", { _user_id: id, _password: password });
  if (error) throw new Error(error.message);
}

/** Super Admin: permanently delete an account (cannot sign in again; its records stay). */
export async function deleteUser(id: string) {
  const { error } = await supabase.rpc("admin_delete_user", { _user_id: id });
  if (error) throw new Error(error.message);
}
