import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import kapal from "@/assets/kapal-foto.jpg";
import { SiteNav } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { homeFor } from "@/lib/access";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "CV MR Express | Agen Pelni Surabaya — Pembukuan" },
      { name: "description", content: "CV MR Express, Agen Pelni Surabaya. Akses resmi MR Express Ledger untuk pembukuan keuangan dan laporan CV MR Express." },
      { property: "og:title", content: "CV MR Express | Agen Pelni Surabaya — Pembukuan" },
      { property: "og:description", content: "Akses resmi pembukuan keuangan CV MR Express, Agen Pelni Surabaya." },
      { property: "og:url", content: "/login" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "CV MR Express", alternateName: "MR Express", description: "Agen Pelni Surabaya" }) }],
  }),
  component: Login,
});

/** Shared sign-in frame (login and first-time setup) in the public site theme. */
export function AuthShell({ children, showBackground = true }: { children: React.ReactNode; showBackground?: boolean }) {
  return (
    <div className="journey-site site-page">
      <SiteNav overlay={false} minimal />
      <main className="s-auth">
        {showBackground && <img src={kapal} alt="" width={1808} height={1200} />}
        <div className="s-auth-card">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Kembali ke Beranda</Link>
          <div className="mt-5 text-center">
            <p className="j-eyebrow !mb-3">MR EXPRESS LEDGER</p>
            <h1>CV MR EXPRESS</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pembukuan Keuangan &amp; Packing List</p>
          </div>
          {children}
          <p className="mt-6 text-center text-[11px] text-muted-foreground">Akses khusus staf CV MR EXPRESS.</p>
        </div>
      </main>
    </div>
  );
}

function Login() {
  const nav = useNavigate();
  const { session, ready, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Each role lands on its own dashboard (Super Admin → Utama, Admin Laporan → Pembukuan, Admin Packing List → Packing List).
  useEffect(() => { if (session && ready) nav({ to: role ? homeFor(role) : "/dashboard", replace: true }); }, [session, ready, role, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Email atau password salah" : /banned/i.test(error.message) ? "Akun ini dinonaktifkan. Hubungi Super Admin." : error.message);
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-xs font-semibold text-muted-foreground">Email
          <div className="relative mt-1"><Mail className="absolute left-3.5 top-3.5 h-4 w-4" /><Input className="pl-10" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">Password
          <div className="relative mt-1"><Lock className="absolute left-3.5 top-3.5 h-4 w-4" /><Input className="pl-10 pr-11" type={showPw ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" aria-label={showPw ? "Sembunyikan password" : "Lihat password"} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
        </label>
        {error && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Memproses..." : "Masuk"}</Button>
      </form>
    </AuthShell>
  );
}
