import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapSuperAdmin, setupStatus } from "@/lib/users-api";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Penyiapan Awal — CV MR Express" },
      { name: "description", content: "Buat akun Super Admin pertama." },
      { property: "og:title", content: "Penyiapan Awal — CV MR Express" },
      { property: "og:description", content: "Buat akun Super Admin pertama." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const nav = useNavigate();
  const [open, setOpen] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [f, setF] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setupStatus().then((r) => setOpen(r.open)).catch((e) => setLoadErr(errMsg(e))); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await bootstrapSuperAdmin(f);
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.password });
      if (error) throw error;
      toast.success("Super Admin berhasil dibuat");
      nav({ to: "/dashboard" });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      {loadErr ? <p className="mt-6 text-sm text-destructive">{loadErr}</p>
        : open === null ? <p className="mt-6 text-center text-sm text-muted-foreground">Memeriksa...</p>
        : !open ? (
          <div className="mt-6 text-center text-sm">
            <p>Super Admin sudah ada. Penyiapan awal ditutup.</p>
            <Link to="/login" className="mt-3 inline-block font-semibold text-primary underline">Kembali ke halaman masuk</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <p className="text-center text-sm font-semibold">Buat akun Super Admin pertama</p>
            <Input placeholder="Nama lengkap" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} maxLength={80} />
            <Input placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Input placeholder="Password (min. 10 karakter)" type="password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            {error && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Membuat..." : "Buat Super Admin"}</Button>
          </form>
        )}
    </AuthShell>
  );
}
