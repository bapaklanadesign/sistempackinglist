import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PL_STATUSES, plStatusLabel, plStatusTone, type PlStatus } from "@/lib/packing-logic";
import { plDetailQ, plError, setPlStatus } from "@/lib/packing-data";
import { printPackingList } from "@/lib/packing-pdf";

export function PlStatusBadge({ s, className }: { s: PlStatus; className?: string }) {
  return <span className={cn("dash-pill", plStatusTone[s], className)}>{plStatusLabel[s]}</span>;
}

/** Refreshes every Packing List query (lists, detail, dashboard, reports, activity). */
export function usePlRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["pl"] });
}

/** Reads the Packing List fresh from the database, then downloads its PDF. */
export function usePrintPl() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const print = async (id: string) => {
    setBusyId(id);
    try {
      const pl = await qc.fetchQuery({ ...plDetailQ(id), staleTime: 0 });
      if (!pl) throw new Error("Packing list tidak ditemukan");
      await printPackingList(pl);
      toast.success(`PDF ${pl.pl_number} diunduh`);
    } catch (e) { toast.error(plError(e)); }
    finally { setBusyId(null); }
  };
  return { print, busyId };
}

export function StatusDialog({ pl, onClose }: { pl: { id: string; pl_number: string; status: PlStatus } | null; onClose: () => void }) {
  const refresh = usePlRefresh();
  const [status, setStatus] = useState<PlStatus>(pl?.status ?? "draft");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (pl && pl.id !== lastId) { setLastId(pl.id); setStatus(pl.status); setNote(""); setErr(null); }

  const save = async () => {
    if (!pl) return;
    if (status === pl.status) return setErr("Pilih status yang berbeda dari status sekarang");
    if (status === "dibatalkan" && note.trim().length < 5) return setErr("Alasan pembatalan wajib diisi (minimal 5 karakter)");
    setBusy(true); setErr(null);
    try {
      await setPlStatus(pl.id, status, note);
      toast.success(`Status ${pl.pl_number} menjadi ${plStatusLabel[status]}`);
      await refresh();
      onClose();
    } catch (e) { setErr(plError(e)); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!pl} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Status Pengiriman</DialogTitle>
          <DialogDescription>{pl?.pl_number} · sekarang <b>{pl ? plStatusLabel[pl.status] : ""}</b></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={(v) => setStatus(v as PlStatus)}>
            <SelectTrigger aria-label="Status baru"><SelectValue /></SelectTrigger>
            <SelectContent>{PL_STATUSES.map((s) => <SelectItem key={s} value={s}>{plStatusLabel[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea placeholder={status === "dibatalkan" ? "Alasan pembatalan (wajib)" : "Catatan (opsional)"} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Status"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
    className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-64" />;
}

export const plMeta = (title: string, description: string) => ({
  meta: [{ name: "robots", content: "noindex, nofollow" }, { title: `${title} — CV MR Express` }, { name: "description", content: description },
    { property: "og:title", content: `${title} — CV MR Express` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }],
});
