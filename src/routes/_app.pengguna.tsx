import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { profilesQ } from "@/lib/data";
import { createUser } from "@/lib/users-api";
import { roleLabel, type Role } from "@/lib/auth";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_app/pengguna")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Pengguna — CV MR Express" }, { name: "description", content: "Kelola akun pengguna sistem." }, { property: "og:title", content: "Pengguna — CV MR Express" }, { property: "og:description", content: "Kelola akun pengguna sistem." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery(profilesQ());
  const [f, setF] = useState({ fullName: "", email: "", password: "", role: "admin1" as Role });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const taken = (r: Role) => r !== "super_admin" && !!q.data?.some((p) => p.role === r);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await createUser(f);
      toast.success("Akun dibuat. Berikan email & password kepada pengguna.");
      setF({ fullName: "", email: "", password: "", role: "admin1" });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Pengguna" />
       <main className="grid min-w-0 items-start gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Daftar Pengguna">
          <QueryState isLoading={q.isLoading} error={q.error} empty={!q.data?.length} onRetry={() => q.refetch()}>
             <div className="divide-y md:hidden">{q.data?.map((p) => <article key={p.id} className="min-w-0 space-y-2 py-3">
               <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{p.full_name || "-"}</p>
               <dl className="space-y-2 text-xs"><div className="min-w-0"><dt className="text-muted-foreground">Email</dt><dd className="[overflow-wrap:anywhere]">{p.email}</dd></div><div><dt className="text-muted-foreground">Peran</dt><dd>{p.role ? roleLabel[p.role as Role] : "Tanpa peran"}</dd></div></dl>
             </article>)}</div>
             <div className="hidden max-w-full overflow-x-auto md:block"><table className="w-full"><thead><tr>{["Nama", "Email", "Peran"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
               <tbody>{q.data?.map((p) => <tr key={p.id}><td className={td}>{p.full_name || "-"}</td><td className={td}>{p.email}</td><td className={td}>{p.role ? roleLabel[p.role as Role] : "Tanpa peran"}</td></tr>)}</tbody></table></div>
          </QueryState>
        </Panel>
        <Panel title="Buat Akun Baru">
           <form onSubmit={submit} className="min-w-0 space-y-3 [&_input]:min-w-0 [&_input]:text-base sm:[&_input]:text-sm">
             <Input aria-label="Nama lengkap" placeholder="Nama lengkap" required maxLength={80} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
             <Input aria-label="Email" placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
             <Input aria-label="Password (min. 10 karakter)" placeholder="Password (min. 10 karakter)" type="password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as Role })}><SelectTrigger aria-label="Peran"><SelectValue /></SelectTrigger>
              <SelectContent>{(["admin1", "admin2", "super_admin"] as Role[]).map((r) => <SelectItem key={r} value={r} disabled={taken(r)}>{roleLabel[r]}{taken(r) ? " (sudah ada)" : ""}</SelectItem>)}</SelectContent></Select>
             {err && <p role="alert" className="break-words rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Membuat..." : "Buat Akun"}</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
