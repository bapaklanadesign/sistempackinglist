import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Tx } from "@/lib/data";
import { errMsg, fmtDate, rupiah, txTypeLabel } from "@/lib/format";

/** Shared audited deletion: database validates ledger access and deletes transfer pairs atomically. */
export function DeleteTxDialog({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tx, setTx] = useState<Tx | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isTransfer = !!tx?.transfer_id || tx?.tx_type === "transfer_in" || tx?.tx_type === "transfer_out";

  useEffect(() => {
    setTx(null); setReason(""); setErr(null); setLoadErr(null);
    if (!txId) return;
    supabase.from("transactions").select("*").eq("id", txId).maybeSingle().then(({ data, error }) => {
      if (error || !data) return setLoadErr(error?.message ?? "Transaksi tidak ditemukan");
      setTx(data);
    });
  }, [txId]);

  const confirm = async () => {
    if (!tx) return;
    if (reason.trim().length < 5) return setErr("Alasan penghapusan wajib diisi (minimal 5 karakter)");
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("delete_transaction", { p_id: tx.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    toast.success(isTransfer ? "Transfer masuk dan keluar dihapus" : "Transaksi dihapus");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["balances"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
    qc.invalidateQueries({ queryKey: ["imports"] });
    onClose();
  };

  return (
    <Dialog open={!!txId} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle>{isTransfer ? "Hapus Transfer" : "Hapus Transaksi"}</DialogTitle></DialogHeader>
        {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : !tx ? <p className="text-sm text-muted-foreground">Mengambil data terbaru...</p> : (
          <div className="space-y-3">
            <div className="rounded border p-3 text-sm">
              <p className="break-words font-semibold">{tx.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(tx.tx_date)} · {txTypeLabel[tx.tx_type]} · {tx.ledger === "admin1" ? "Admin 1" : "Admin 2"}
              </p>
              <p className="mt-1 font-bold">{rupiah(tx.amount)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Data yang dihapus tidak dapat dikembalikan. Penghapusan tercatat di Audit Log.</p>
            {isTransfer && <p className="text-sm">Kedua catatan transfer masuk dan keluar akan dihapus bersamaan. Saldo rekening asal dan tujuan akan dihitung ulang.</p>}
            <Textarea aria-label="Alasan penghapusan" placeholder="Alasan penghapusan (wajib, min. 5 karakter)" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Batal</Button>
              <Button variant="destructive" className="flex-1" onClick={confirm} disabled={busy}>{busy ? "Menghapus..." : "Ya, Hapus"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
