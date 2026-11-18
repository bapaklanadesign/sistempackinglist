import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "admin1" | "admin2";
export type Ledger = "admin1" | "admin2";
export const roleLabel: Record<Role, string> = { super_admin: "Super Admin", admin1: "Admin 1", admin2: "Admin 2" };

type AuthState = {
  ready: boolean;
  session: Session | null;
  role: Role | null;
  roleError: string | null;
  fullName: string;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") { qc.cancelQueries(); qc.clear(); }
    });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) { setRole(null); setFullName(""); return; }
    setReady(false);
    // Defer to avoid calling Supabase inside the auth callback.
    const t = setTimeout(async () => {
      const [r, p] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
      ]);
      if (r.error) setRoleError(r.error.message);
      else if (!r.data) setRoleError("Akun ini belum memiliki peran. Hubungi Super Admin.");
      else setRoleError(null);
      setRole((r.data?.role as Role) ?? null);
      setFullName(p.data?.full_name ?? "");
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [uid]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ ready, session, role, roleError, fullName, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
