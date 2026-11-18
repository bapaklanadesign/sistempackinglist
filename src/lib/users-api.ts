// Account administration without a server runtime: the browser calls audited
// SECURITY DEFINER database functions with the publishable key. Permission checks
// (Super Admin only, one-time setup, one Admin 1/Admin 2 account) run in the database.
import { supabase } from "@/integrations/supabase/client";

export type NewUserRole = "super_admin" | "admin1" | "admin2";
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
  if (!["super_admin", "admin1", "admin2"].includes(role)) throw new Error("Peran tidak valid");
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
