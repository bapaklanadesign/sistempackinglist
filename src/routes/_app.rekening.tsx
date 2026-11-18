import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { balancesQ, type Balance } from "@/lib/data";
import type { Ledger } from "@/lib/auth";
import { errMsg, parseAmount, rupiah } from "@/lib/format";

export const Route = createFileRoute("/_app/rekening")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Rekening & Saldo Awal — CV MR Express" }, { name: "description", content: "Kelola saldo awal rekening." }, { property: "og:title", content: "Rekening — CV MR Express" }, { property: "og:description", content: "Kelola saldo awal rekening." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const ledgerName = (l: string | null) => (l === "admin1" ? "Admin Laporan 1" : "Admin Laporan 2");

function Page() {
  const qc = useQueryClient();
  const q = useQuery(balancesQ());
  const [edit, setEdit] = useState<Balance | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editAcc, setEditAcc] = useState<Balance | null>(null);
  const [delAcc, setDelAcc] = useState<Balance | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["balances"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const open = (b: Balance) => { setEdit(b); setAmount(String(Number(b.opening_balance))); setReason(""); setErr(null); };
  const save = async () => {
    const v = amount.trim() === "0" ? 0 : parseAmount(amount);
    if (v === null) return setErr("Nominal tidak valid");
    if (reason.trim().length < 5) return setErr("Alasan wajib diisi (minimal 5 karakter)");
    setBusy(true);
    const { error } = await supabase.rpc("set_opening_balance", { p_account_id: edit!.account_id!, p_amount: v, p_reason: reason });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Saldo awal diperbarui");
    refresh();
    setEdit(null);
  };

  const remove = async () => {
    if (!delAcc?.account_id) return;
    setDelBusy(true);
    const { error } = await supabase.rpc("delete_bank_account", { p_id: delAcc.account_id });
    setDelBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Rekening dihapus");
    refresh();
    setDelAcc(null);
  };

  return (
    <>
      <PageHeader title="Rekening & Saldo Awal">
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Tambah Rekening</Button>
      </PageHeader>
      <main className="p-4">
        <Panel title="Daftar Rekening">
          <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{["Pembukuan", "Rekening", "Saldo Awal", "Pemasukan", "Pengeluaran", "Transfer Masuk", "Transfer Keluar", "Saldo Akhir", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
              <tbody>{q.data?.slice().sort((a, b) => (a.ledger ?? "").localeCompare(b.ledger ?? "") || (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((b) => (
                <tr key={b.account_id}><td className={td}>{ledgerName(b.ledger)}</td><td className={td}><b>{b.name}</b></td><td className={td}>{rupiah(b.opening_balance)}</td><td className={td}>{rupiah(b.income)}</td><td className={td}>{rupiah(b.expense)}</td><td className={td}>{rupiah(b.transfer_in)}</td><td className={td}>{rupiah(b.transfer_out)}</td><td className={`${td} font-bold`}>{rupiah(b.balance)}</td>
                  <td className={td}><div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => open(b)}>Ubah Saldo Awal</Button>
                    <Button size="sm" variant="ghost" aria-label="Edit rekening" onClick={() => setEditAcc(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" aria-label="Hapus rekening" className="text-destructive" onClick={() => setDelAcc(b)}><Trash2 className="h-4 w-4" /></Button>
                  </div></td></tr>
              ))}</tbody>
            </table></div>
          </QueryState>
        </Panel>
      </main>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Saldo Awal {edit?.name} ({ledgerName(edit?.ledger ?? null)})</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Saldo awal" />
            <Textarea placeholder="Alasan perubahan (wajib)" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
            <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {adding && <AddAccountDialog onClose={() => setAdding(false)} onSaved={refresh} />}
      {editAcc && <EditAccountDialog acc={editAcc} onClose={() => setEditAcc(null)} onSaved={refresh} />}
      <ConfirmDialog
        open={!!delAcc}
        onOpenChange={(o) => !o && setDelAcc(null)}
        title={`Hapus rekening ${delAcc?.name ?? ""}?`}
        description={`Rekening ${delAcc?.name ?? ""} (${ledgerName(delAcc?.ledger ?? null)}) akan dihapus permanen dan penghapusan tercatat di Audit Log. Rekening yang masih memiliki transaksi tidak dapat dihapus.`}
        confirmLabel="Ya, hapus"
        destructive
        busy={delBusy}
        onConfirm={remove}
      />
    </>
  );
}

function AddAccountDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ledger: "admin1" as Ledger, name: "", opening: "", sort: "0" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim()) return setErr("Nama rekening wajib diisi");
    const opening = f.opening.trim() === "" || f.opening.trim() === "0" ? 0 : parseAmount(f.opening);
    if (opening === null) return setErr("Saldo awal tidak valid");
    const sort = Number.parseInt(f.sort, 10);
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("create_bank_account", {
      p_ledger: f.ledger, p_name: f.name.trim().slice(0, 80), p_opening_balance: opening, p_sort_order: Number.isFinite(sort) ? sort : 0,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Rekening ditambahkan");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Tambah Rekening</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={f.ledger} onValueChange={(v) => setF({ ...f, ledger: v as Ledger })}><SelectTrigger aria-label="Pembukuan"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="admin1">Admin Laporan 1</SelectItem><SelectItem value="admin2">Admin Laporan 2</SelectItem></SelectContent></Select>
          <Input placeholder="Nama rekening (mis. BCA, BRI)" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Saldo awal (opsional)" inputMode="decimal" value={f.opening} onChange={(e) => setF({ ...f, opening: e.target.value })} />
          <Input placeholder="Urutan tampilan (angka)" inputMode="numeric" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} />
          {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Rekening"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({ acc, onClose, onSaved }: { acc: Balance; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(acc.name ?? "");
  const [sort, setSort] = useState(String(acc.sort_order ?? 0));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return setErr("Nama rekening wajib diisi");
    const s = Number.parseInt(sort, 10);
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("update_bank_account", { p_id: acc.account_id!, p_name: name.trim().slice(0, 80), p_sort_order: Number.isFinite(s) ? s : 0 });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Rekening diperbarui");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Rekening ({ledgerName(acc.ledger)})</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nama rekening" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Urutan tampilan (angka)" inputMode="numeric" value={sort} onChange={(e) => setSort(e.target.value)} />
          {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Perubahan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
