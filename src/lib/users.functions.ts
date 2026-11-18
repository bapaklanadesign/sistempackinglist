import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewUser = { email: string; password: string; fullName: string; role: "super_admin" | "admin1" | "admin2" };

function validate(d: unknown): NewUser {
  const o = (d ?? {}) as Record<string, unknown>;
  const email = String(o["email"] ?? "").trim().toLowerCase();
  const password = String(o["password"] ?? "");
  const fullName = String(o["fullName"] ?? "").trim().slice(0, 80);
  const role = String(o["role"] ?? "") as NewUser["role"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Email tidak valid");
  if (password.length < 10 || password.length > 72) throw new Error("Password minimal 10 karakter");
  if (!fullName) throw new Error("Nama wajib diisi");
  if (!["super_admin", "admin1", "admin2"].includes(role)) throw new Error("Peran tidak valid");
  return { email, password, fullName, role };
}

async function create(u: NewUser) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: u.email, password: u.password, email_confirm: true, user_metadata: { full_name: u.fullName },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Gagal membuat akun");
  const id = data.user.id;
  await supabaseAdmin.from("profiles").upsert({ id, full_name: u.fullName, email: u.email });
  const r = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: u.role });
  if (r.error) {
    await supabaseAdmin.auth.admin.deleteUser(id);
    throw new Error(r.error.code === "23505" ? "Pengguna sudah memiliki peran" : r.error.message);
  }
  return { id };
}

/** Super Admin creates an account and assigns its role. */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (error || !ok) throw new Error("Hanya Super Admin yang dapat membuat akun");
    if (data.role !== "super_admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", data.role);
      if ((count ?? 0) > 0) throw new Error(`Akun untuk ${data.role === "admin1" ? "Admin 1" : "Admin 2"} sudah ada`);
    }
    return create(data);
  });

/** Whether the one-time initial Super Admin setup is still open. */
export const setupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
  if (error) throw new Error("Tidak dapat memeriksa status: " + error.message);
  return { open: (count ?? 0) === 0 };
});

/** One-time bootstrap: creates the first Super Admin only while none exists. */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => validate({ ...(d as object), role: "super_admin" }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new Error("Super Admin sudah dibuat. Penyiapan awal ditutup.");
    return create(data);
  });
