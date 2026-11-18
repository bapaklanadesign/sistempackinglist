import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { itemToInput, plDetailQ, plError, plToHeader, portsQ, savePackingList, vesselsQ, type PlRow } from "@/lib/packing-data";
import { validatePl, type PlHeaderInput } from "@/lib/packing-logic";
import { usePlRefresh } from "./shared";

const NONE = "__none";
type Key = "vessel_id" | "voyage_no" | "origin_port_id" | "destination_port_id" | "etd" | "eta" | "container_no" | "seal_no";

/** Edits only the voyage schedule of a Packing List; items are re-read from the database and saved unchanged. */
export function ScheduleDialog({ pl, onClose }: { pl: PlRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = usePlRefresh();
  const vessels = useQuery(vesselsQ());
  const ports = useQuery(portsQ());
  const [h, setH] = useState<PlHeaderInput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setH(pl ? plToHeader(pl) : null); setErr(null); }, [pl]);
  const set = (k: Key, v: string) => setH((p) => (p ? { ...p, [k]: v } : p));
  const save = async () => {
    if (!pl || !h) return;
    setBusy(true); setErr(null);
    try {
      const fresh = await qc.fetchQuery({ ...plDetailQ(pl.id), staleTime: 0 });
      if (!fresh) throw new Error("Packing list tidak ditemukan");
      const header = { ...plToHeader(fresh), ...pick(h) };
      const items = fresh.items.map(itemToInput);
      const msg = validatePl(header, items);
      if (msg) throw new Error(msg);
      await savePackingList(pl.id, header, items);
      toast.success(`Jadwal ${pl.pl_number} diperbarui`);
      await refresh();
      onClose();
    } catch (e) { setErr(plError(e)); }
    finally { setBusy(false); }
  };
  const sel = (k: Key, label: string, opts: { id: string; name: string }[]) => (
    <label className="block text-xs font-semibold">{label}
      <Select value={h?.[k] || NONE} onValueChange={(v) => set(k, v === NONE ? "" : v)}>
        <SelectTrigger className="mt-1" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={NONE}>— Belum ditentukan —</SelectItem>{opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
  const inp = (k: Key, label: string, type = "text") => (
    <label className="block text-xs font-semibold">{label}<Input className="mt-1" type={type} maxLength={40} value={h?.[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></label>
  );
  return (
    <Dialog open={!!pl} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Atur Jadwal Pengiriman</DialogTitle><DialogDescription>{pl?.pl_number}</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {sel("vessel_id", "Kapal", vessels.data ?? [])}{inp("voyage_no", "No. Voyage")}
          {sel("origin_port_id", "Pelabuhan Asal", ports.data ?? [])}{sel("destination_port_id", "Pelabuhan Tujuan", ports.data ?? [])}
          {inp("etd", "ETD (Berangkat)", "date")}{inp("eta", "ETA (Tiba)", "date")}
          {inp("container_no", "No. Kontainer")}{inp("seal_no", "No. Segel")}
        </div>
        {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
        <Button className="w-full" onClick={save} disabled={busy || !h}>{busy ? "Menyimpan..." : "Simpan Jadwal"}</Button>
      </DialogContent>
    </Dialog>
  );
}
const pick = (h: PlHeaderInput) => ({ vessel_id: h.vessel_id, voyage_no: h.voyage_no, origin_port_id: h.origin_port_id, destination_port_id: h.destination_port_id, etd: h.etd, eta: h.eta, container_no: h.container_no, seal_no: h.seal_no });
