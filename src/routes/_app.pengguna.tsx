import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Power, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createUser, deleteUser, listUsers, resetUserPassword, setUserActive, updateUser, type ManagedUser } from "@/lib/users-api";
import { roleLabel, useAuth, type Role } from "@/lib/auth";
import { errMsg, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/pengguna")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Manajemen Pengguna — CV MR Express" }, { name: "description", content: "Kelola akun dan peran pengguna sistem." }, { property: "og:title", content: "Manajemen Pengguna — CV MR Express" }, { property: "og:description", content: "Kelola akun dan peran pengguna sistem." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const ROLE_OPTIONS: Role[] = ["admin1", "admin2", "admin_packing", "super_admin"];
const usersQ = { queryKey: ["users"], queryFn: listUsers };

function RoleSelect({ value, onChange, taken, disabled }: { value: Role; onChange: (r: Role) => void; taken: (r: Role) => boolean; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={!!disabled}>
      <SelectTrigger aria-label="Peran"><SelectValue /></SelectTrigger>
      <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} disabled={taken(r)}>{roleLabel[r]}{taken(r) ? " (sudah ada)" : ""}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function StatusPill({ u }: { u: ManagedUser }) {
  return u.active
    ? <span className="rounded bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">Aktif</span>
    : <span className="rounded bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-destructive">Nonaktif</span>;
}

function Page() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const me = session?.user.id;
  const q = useQuery(usersQ);
  const [f, setF] = useState({ fullName: "", email: "", password: "", role: "admin_packing" as Role });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<ManagedUser | null>(null);
  const [pw, setPw] = useState<ManagedUser | null>(null);
  const [toggle, setToggle] = useState<ManagedUser | null>(null);
  const [toggling, setToggling] = useState(false);
  const [del, setDel] = useState<ManagedUser | null>(null);
  // Admin Laporan 1 and 2 each keep one account (one ledger each); the database enforces the same rule.
  const taken = (r: Role, except?: string) => (r === "admin1" || r === "admin2") && !!q.data?.some((u) => u.role === r && u.id !== except);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["profiles"] }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await createUser(f);
      toast.success("Akun dibuat. Berikan email & password kepada pengguna.");
      setF({ fullName: "", email: "", password: "", role: "admin_packing" });
      refresh();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  const doToggle = async () => {
    if (!toggle) return;
    setToggling(true);
    try {
      await setUserActive(toggle.id, !toggle.active);
      toast.success(toggle.active ? "Akun dinonaktifkan" : "Akun diaktifkan kembali");
      setToggle(null); refresh();
    } catch (e) { toast.error(errMsg(e)); } finally { setToggling(false); }
  };

  const actions = (u: ManagedUser) => (
    <div className="flex flex-nowrap gap-1">
      <Button size="sm" variant="ghost" aria-label={`Ubah ${u.email}`} onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" aria-label={`Reset password ${u.email}`} onClick={() => setPw(u)}><KeyRound className="h-4 w-4" /></Button>
      {u.id !== me && <Button size="sm" variant="ghost" className={u.active ? "text-destructive" : "text-success"} aria-label={`${u.active ? "Nonaktifkan" : "Aktifkan"} ${u.email}`} onClick={() => setToggle(u)}><Power className="h-4 w-4" /></Button>}
      {u.id !== me && <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Hapus ${u.email}`} onClick={() => setDel(u)}><Trash2 className="h-4 w-4" /></Button>}
    </div>
  );

  return (
    <>
      <PageHeader title="Manajemen Pengguna" subtitle="Hanya Super Admin yang dapat membuat akun dan mengubah peran" />
      <main className="grid min-w-0 items-start gap-4 p-3 sm:p-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Daftar Pengguna">
          <QueryState isLoading={q.isLoading} error={q.error} empty={!q.data?.length} onRetry={() => q.refetch()}>
            <div className="divide-y md:hidden">{q.data?.map((u) => <article key={u.id} className="min-w-0 space-y-2 py-3">
              <div className="flex items-start justify-between gap-2"><p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{u.full_name || "-"}{u.id === me && " (Anda)"}</p><StatusPill u={u} /></div>
              <dl className="space-y-2 text-xs"><div className="min-w-0"><dt className="text-muted-foreground">Email</dt><dd className="[overflow-wrap:anywhere]">{u.email}</dd></div><div><dt className="text-muted-foreground">Peran</dt><dd>{u.role ? roleLabel[u.role] : "Tanpa peran"}</dd></div><div><dt className="text-muted-foreground">Terakhir masuk</dt><dd>{u.last_sign_in_at ? fmtDate(u.last_sign_in_at.slice(0, 10)) : "Belum pernah"}</dd></div></dl>
              {actions(u)}
            </article>)}</div>
            <div className="hidden max-w-full overflow-x-auto md:block"><table className="w-full"><thead><tr>{["Nama", "Email", "Peran", "Status", "Terakhir Masuk", "Aksi"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{q.data?.map((u) => <tr key={u.id}><td className={td}>{u.full_name || "-"}{u.id === me && <span className="text-muted-foreground"> (Anda)</span>}</td><td className={td}>{u.email}</td><td className={td}>{u.role ? roleLabel[u.role] : "Tanpa peran"}</td><td className={td}><StatusPill u={u} /></td><td className={td}>{u.last_sign_in_at ? fmtDate(u.last_sign_in_at.slice(0, 10)) : "Belum pernah"}</td><td className={td}>{actions(u)}</td></tr>)}</tbody></table></div>
          </QueryState>
        </Panel>
        <Panel title="Buat Akun Baru">
          <form onSubmit={submit} className="min-w-0 space-y-3 [&_input]:min-w-0 [&_input]:text-base sm:[&_input]:text-sm">
            <Input aria-label="Nama lengkap" placeholder="Nama lengkap" required maxLength={80} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            <Input aria-label="Email" placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Input aria-label="Password awal (min. 10 karakter)" placeholder="Password awal (min. 10 karakter)" type="password" required minLength={10} maxLength={72} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <RoleSelect value={f.role} onChange={(r) => setF({ ...f, role: r })} taken={(r) => taken(r)} />
            {err && <p role="alert" className="break-words rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Membuat..." : "Buat Akun"}</Button>
          </form>
        </Panel>
      </main>
      <EditDialog user={edit} self={edit?.id === me} taken={taken} onClose={() => setEdit(null)} onSaved={refresh} />
      <PasswordDialog user={pw} onClose={() => setPw(null)} />
      <DeleteDialog user={del} onClose={() => setDel(null)} onDeleted={refresh} />
      <ConfirmDialog open={!!toggle} onOpenChange={(o) => !o && setToggle(null)} busy={toggling} destructive={!!toggle?.active}
        title={toggle?.active ? "Nonaktifkan akun?" : "Aktifkan kembali akun?"}
        description={toggle?.active ? `${toggle.email} tidak akan bisa masuk dan sesi yang sedang berjalan diakhiri. Data yang sudah dibuat tetap tersimpan.` : `${toggle?.email ?? ""} dapat masuk kembali dengan password terakhirnya.`}
        confirmLabel={toggle?.active ? "Ya, nonaktifkan" : "Ya, aktifkan"} onConfirm={doToggle} />
    </>
  );
}

function EditDialog({ user, self, taken, onClose, onSaved }: { user: ManagedUser | null; self: boolean; taken: (r: Role, except?: string) => boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ fullName: "", email: "", role: "admin_packing" as Role });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (user && loadedFor !== user.id) { setLoadedFor(user.id); setF({ fullName: user.full_name, email: user.email, role: user.role ?? "admin1" }); setErr(null); }
  if (!user && loadedFor) setLoadedFor(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    setBusy(true); setErr(null);
    try { await updateUser(user.id, f); toast.success("Akun diperbarui"); onSaved(); onClose(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ubah Akun</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Input aria-label="Nama lengkap" required maxLength={80} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          <Input aria-label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <RoleSelect value={f.role} onChange={(r) => setF({ ...f, role: r })} taken={(r) => taken(r, user?.id)} disabled={self} />
          {self && <p className="text-xs text-muted-foreground">Peran akun Anda sendiri tidak dapat diubah.</p>}
          {err && <p role="alert" className="break-words rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    setBusy(true); setErr(null);
    try { await resetUserPassword(user.id, pw); toast.success("Password diganti. Berikan password baru kepada pengguna."); setPw(""); onClose(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o && !busy) { setPw(""); setErr(null); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">Password baru untuk <b>{user?.email}</b>. Sesi lain akun ini akan diakhiri.</p>
          <Input aria-label="Password baru (min. 10 karakter)" placeholder="Password baru (min. 10 karakter)" type="password" required minLength={10} maxLength={72} value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p role="alert" className="break-words rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan Password"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DELETE_WORD = "HAPUS";

function DeleteDialog({ user, onClose, onDeleted }: { user: ManagedUser | null; onClose: () => void; onDeleted: () => void }) {
  const [word, setWord] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { if (busy) return; setWord(""); setErr(null); onClose(); };
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || word.trim().toUpperCase() !== DELETE_WORD) return;
    setBusy(true); setErr(null);
    try {
      await deleteUser(user.id);
      toast.success(`Akun ${user.email} dihapus permanen`);
      setWord(""); onDeleted(); onClose();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Hapus akun permanen?</DialogTitle></DialogHeader>
        <form onSubmit={confirm} className="space-y-3">
          <div role="alert" className="flex gap-2 rounded border border-destructive/40 bg-danger-soft px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-1 [overflow-wrap:anywhere]">
              <p className="font-semibold">Peringatan: tindakan ini tidak dapat dibatalkan.</p>
              <p>Akun <b>{user?.full_name || user?.email}</b> ({user?.email}) akan dihapus dari sistem login. Pengguna langsung keluar dan tidak bisa masuk lagi.</p>
              <p>Transaksi, laporan, dan Packing List yang pernah dibuat akun ini tetap tersimpan.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Jika hanya ingin memblokir sementara, gunakan tombol nonaktifkan. Ketik <b>{DELETE_WORD}</b> untuk melanjutkan.</p>
          <Input aria-label={`Ketik ${DELETE_WORD} untuk konfirmasi`} placeholder={DELETE_WORD} autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} className="text-base sm:text-sm" />
          {err && <p role="alert" className="break-words rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={close} disabled={busy}>Batal</Button><Button type="submit" variant="destructive" disabled={busy || word.trim().toUpperCase() !== DELETE_WORD}>{busy ? "Menghapus..." : "Ya, hapus akun"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
