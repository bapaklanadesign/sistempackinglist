import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountsQ, type Tx } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { errMsg, fmtDate, parseAmount, rupiah, txTypeLabel } from "@/lib/format";

type Form = { account_id: string; tx_date: string; description: string; tx_type: "income" | "expense"; amount: string; category: string; reason: string };

/** Edit flow: fetch latest row -> edit -> (reason) -> review old vs new -> confirm -> atomic RPC with audit log. */
export function EditTxDialog({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const qc = useQueryClient();
  const accounts = useQuery(accountsQ());
  const [orig, setOrig] = useState<Tx | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrig(null); setF(null); setStep("edit"); setErr(null); setLoadErr(null);
    if (!txId) return;
    supabase.from("transactions").select("*").eq("id", txId).maybeSingle().then(({ data, error }) => {
      if (error || !data) return setLoadErr(error?.message ?? "Transaksi tidak ditemukan");
      setOrig(data);
      setF({ account_id: data.account_id, tx_date: data.tx_date, description: data.description, tx_type: data.tx_type as "income", amount: String(Number(data.amount)), category: data.category ?? "", reason: "" });
    });
  }, [txId]);

  const accName = (id: string) => accounts.data?.find((a) => a.id === id)?.name ?? "-";
  const ledgerAccounts = accounts.data?.filter((a) => a.ledger === orig?.ledger) ?? [];
  const isTransfer = orig?.tx_type === "transfer_in" || orig?.tx_type === "transfer_out";

  const review = () => {
    if (!f) return;
    if (!f.description.trim()) return setErr("Keterangan wajib diisi");
    if (parseAmount(f.amount) === null) return setErr("Nominal tidak valid");
    if (isSuper && f.reason.trim().length < 5) return setErr("Alasan perubahan wajib diisi (minimal 5 karakter)");
    setErr(null); setStep("review");
  };

  const confirm = async () => {
    if (!f || !orig) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("update_transaction", {
      p_id: orig.id, p_account_id: f.account_id, p_date: f.tx_date, p_description: f.description.trim(),
      p_type: f.tx_type, p_amount: parseAmount(f.amount)!, p_category: f.category, p_reason: f.reason,
    });
    setBusy(false);
    if (error) { setErr(error.message); setStep("edit"); return; }
    toast.success("Perubahan transaksi tersimpan");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["balances"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
    onClose();
  };

  const rows: [string, string, string][] = orig && f ? [
    ["Tanggal", fmtDate(orig.tx_date), fmtDate(f.tx_date)],
    ["Rekening", accName(orig.account_id), accName(f.account_id)],
    ["Jenis", txTypeLabel[orig.tx_type] ?? "", txTypeLabel[f.tx_type] ?? ""],
    ["Keterangan", orig.description, f.description.trim()],
    ["Nominal", rupiah(orig.amount), rupiah(parseAmount(f.amount))],
    ["Kategori", orig.category ?? "-", f.category.trim() || "-"],
  ] : [];

  return (
    <Dialog open={!!txId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{step === "edit" ? "Edit Transaksi" : "Periksa Perubahan"}</DialogTitle></DialogHeader>
        {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : !f || !orig ? <p className="text-sm text-muted-foreground">Mengambil data terbaru...</p>
          : isTransfer ? <p className="text-sm">Transaksi transfer internal tidak dapat diedit.</p>
          : step === "edit" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Pembukuan: <b>{orig.ledger === "admin1" ? "Admin Laporan 1" : "Admin Laporan 2"}</b></p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={f.tx_date} onChange={(e) => setF({ ...f, tx_date: e.target.value })} />
                <Select value={f.account_id} onValueChange={(v) => setF({ ...f, account_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ledgerAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input value={f.description} maxLength={200} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Keterangan" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={f.tx_type} onValueChange={(v) => setF({ ...f, tx_type: v as Form["tx_type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent>
                </Select>
                <Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Nominal" />
              </div>
              <Input value={f.category} maxLength={50} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Kategori (opsional)" />
              <Textarea value={f.reason} maxLength={500} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={isSuper ? "Alasan perubahan (wajib)" : "Alasan perubahan (opsional)"} />
              {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
              <Button className="w-full" onClick={review}>Lanjut ke Pemeriksaan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <table className="w-full text-sm">
                <thead><tr><th className="text-left">Kolom</th><th className="text-left">Data Lama</th><th className="text-left">Data Baru</th></tr></thead>
                <tbody>{rows.map(([k, a, b]) => (
                  <tr key={k} className={a !== b ? "bg-warning-soft" : ""}><td className="py-1 pr-2 font-semibold">{k}</td><td className="pr-2">{a}</td><td>{b}</td></tr>
                ))}</tbody>
              </table>
              {f.reason.trim() && <p className="text-xs"><b>Alasan:</b> {f.reason.trim()}</p>}
              {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("edit")} disabled={busy}>Kembali</Button>
                <Button className="flex-1" onClick={confirm} disabled={busy}>{busy ? "Menyimpan..." : "Konfirmasi Perubahan"}</Button>
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}
