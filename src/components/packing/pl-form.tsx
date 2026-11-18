import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Panel, QueryState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { today } from "@/lib/format";
import { PL_CONDITIONS, PL_UNITS, conditionLabel, emptyItem, fmtNum, itemTotals, itemVolume, parseNum, unitLabel, validatePl, type PlHeaderInput, type PlItemInput } from "@/lib/packing-logic";
import { partiesQ, plError, portsQ, savePackingList, vesselsQ } from "@/lib/packing-data";
import { MasterDialog, type MasterKind } from "./master-crud";
import { usePlRefresh } from "./shared";

const NONE = "__none";
const blankHeader = (): PlHeaderInput => ({ pl_date: today(), shipper_id: "", consignee_id: "", vessel_id: "", voyage_no: "", origin_port_id: "", destination_port_id: "", container_no: "", seal_no: "", etd: "", eta: "", notes: "" });
const numStr = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 text-xs font-semibold ${className ?? ""}`}>{label}{required && <span className="text-destructive"> *</span>}<div className="mt-1">{children}</div></label>;
}

function RefSelect({ value, onChange, options, placeholder, optional, onAdd, label }: {
  value: string; onChange: (v: string) => void; options: { id: string; name: string; hint?: string | null }[]; placeholder: string; optional?: boolean; onAdd: () => void; label: string;
}) {
  return (
    <div className="flex min-w-0 gap-1">
      <Select value={value || (optional ? NONE : "")} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger aria-label={label} className="min-w-0 flex-1"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>— Belum ditentukan —</SelectItem>}
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}{o.hint ? ` · ${o.hint}` : ""}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="icon" aria-label={`Tambah ${label} baru`} onClick={onAdd}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

/** Create (id null) or edit form for one Packing List and its items; saves through save_packing_list. */
export function PlForm({ id, initialHeader, initialItems, plNumber }: { id: string | null; initialHeader?: PlHeaderInput; initialItems?: PlItemInput[]; plNumber?: string }) {
  const nav = useNavigate();
  const refresh = usePlRefresh();
  const parties = useQuery(partiesQ());
  const vessels = useQuery(vesselsQ());
  const ports = useQuery(portsQ());
  const [h, setH] = useState<PlHeaderInput>(initialHeader ?? blankHeader());
  const [items, setItems] = useState<PlItemInput[]>(initialItems?.length ? initialItems : [emptyItem()]);
  // Raw text for numeric inputs so typing "1," is not lost.
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<{ kind: MasterKind; field: keyof PlHeaderInput } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const totals = useMemo(() => itemTotals(items), [items]);
  const set = (k: keyof PlHeaderInput, v: string) => setH((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<PlItemInput>) => setItems((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const numInput = (i: number, k: "qty" | "weight_kg" | "length_cm" | "width_cm" | "height_cm" | "volume_m3" | "value_idr", label: string) => {
    const key = `${i}.${k}`;
    return (
      <Field label={label} required={k === "qty"}>
        <Input inputMode="decimal" value={raw[key] ?? numStr(items[i]?.[k] ?? null)} onChange={(e) => {
          const text = k === "value_idr" ? e.target.value.replace(/[^\d]/g, "") : e.target.value;
          setRaw((r) => ({ ...r, [key]: text })); setItem(i, { [k]: parseNum(text) });
        }} />
      </Field>
    );
  };
  const removeItem = (i: number) => { setItems((p) => p.filter((_, j) => j !== i)); setRaw({}); };

  const save = async () => {
    const msg = validatePl(h, items);
    if (msg) { setErr(msg); return; }
    setBusy(true); setErr(null);
    try {
      const rec = await savePackingList(id, h, items);
      toast.success(id ? `Packing List ${rec.pl_number} diperbarui` : `Packing List ${rec.pl_number} dibuat`);
      await refresh();
      nav({ to: "/packing-list/$id", params: { id: rec.id } });
    } catch (e) { setErr(plError(e)); }
    finally { setBusy(false); }
  };

  const partyOpts = (kind: string) => (parties.data ?? []).filter((p) => p.kind === kind).map((p) => ({ id: p.id, name: p.name, hint: p.city }));
  const portOpts = (ports.data ?? []).map((p) => ({ id: p.id, name: p.name, hint: p.city }));
  const loading = parties.isLoading || vessels.isLoading || ports.isLoading;

  return (
    <main className="min-w-0 space-y-4 p-3 pb-28 sm:p-6 sm:pb-28">
      <QueryState isLoading={loading} error={parties.error ?? vessels.error ?? ports.error} onRetry={() => { parties.refetch(); vessels.refetch(); ports.refetch(); }}>
        <Panel title={id ? `Edit ${plNumber ?? "Packing List"}` : "Data Pengiriman"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Tanggal Packing List" required><Input type="date" value={h.pl_date} onChange={(e) => set("pl_date", e.target.value)} /></Field>
            <Field label="Pengirim" required><RefSelect label="Pengirim" value={h.shipper_id} onChange={(v) => set("shipper_id", v)} options={partyOpts("pengirim")} placeholder="Pilih pengirim" onAdd={() => setAdding({ kind: "pengirim", field: "shipper_id" })} /></Field>
            <Field label="Penerima" required><RefSelect label="Penerima" value={h.consignee_id} onChange={(v) => set("consignee_id", v)} options={partyOpts("penerima")} placeholder="Pilih penerima" onAdd={() => setAdding({ kind: "penerima", field: "consignee_id" })} /></Field>
            <Field label="Kapal"><RefSelect label="Kapal" optional value={h.vessel_id} onChange={(v) => set("vessel_id", v)} options={(vessels.data ?? []).map((v) => ({ id: v.id, name: v.name, hint: v.operator }))} placeholder="Pilih kapal" onAdd={() => setAdding({ kind: "kapal", field: "vessel_id" })} /></Field>
            <Field label="No. Voyage"><Input maxLength={40} value={h.voyage_no} onChange={(e) => set("voyage_no", e.target.value)} /></Field>
            <Field label="Pelabuhan Asal"><RefSelect label="Pelabuhan asal" optional value={h.origin_port_id} onChange={(v) => set("origin_port_id", v)} options={portOpts} placeholder="Pilih pelabuhan" onAdd={() => setAdding({ kind: "pelabuhan", field: "origin_port_id" })} /></Field>
            <Field label="Pelabuhan Tujuan"><RefSelect label="Pelabuhan tujuan" optional value={h.destination_port_id} onChange={(v) => set("destination_port_id", v)} options={portOpts} placeholder="Pilih pelabuhan" onAdd={() => setAdding({ kind: "pelabuhan", field: "destination_port_id" })} /></Field>
            <Field label="ETD (Berangkat)"><Input type="date" value={h.etd} onChange={(e) => set("etd", e.target.value)} /></Field>
            <Field label="ETA (Tiba)"><Input type="date" value={h.eta} onChange={(e) => set("eta", e.target.value)} /></Field>
            <Field label="No. Kontainer"><Input maxLength={40} value={h.container_no} onChange={(e) => set("container_no", e.target.value)} /></Field>
            <Field label="No. Segel"><Input maxLength={40} value={h.seal_no} onChange={(e) => set("seal_no", e.target.value)} /></Field>
            <Field label="Catatan" className="sm:col-span-2 lg:col-span-3"><Textarea maxLength={1000} value={h.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel title={`Daftar Barang (${items.length})`} action={<Button size="sm" variant="outline" disabled={items.length >= 500} onClick={() => setItems((p) => [...p, emptyItem()])}><Plus className="h-4 w-4" />Tambah Barang</Button>}>
          <div className="space-y-3">
            {items.map((it, i) => {
              const vol = itemVolume(it.qty ?? 0, it.length_cm, it.width_cm, it.height_cm, it.volume_m3);
              const dims = !!(it.length_cm && it.width_cm && it.height_cm);
              return (
                <fieldset key={i} className="min-w-0 rounded-lg border p-3">
                  <legend className="px-1 text-xs font-bold">Barang {i + 1}</legend>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                    <Field label="Nama Barang" required className="col-span-2 lg:col-span-2"><Input maxLength={200} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} /></Field>
                    {numInput(i, "qty", "Jumlah")}
                    <Field label="Satuan"><Select value={it.unit} onValueChange={(v) => setItem(i, { unit: v })}><SelectTrigger aria-label="Satuan"><SelectValue /></SelectTrigger>
                      <SelectContent>{PL_UNITS.map((u) => <SelectItem key={u} value={u}>{unitLabel[u]}</SelectItem>)}</SelectContent></Select></Field>
                    {numInput(i, "weight_kg", "Berat / satuan (kg)")}
                    <Field label="Kondisi"><Select value={it.condition} onValueChange={(v) => setItem(i, { condition: v })}><SelectTrigger aria-label="Kondisi"><SelectValue /></SelectTrigger>
                      <SelectContent>{PL_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{conditionLabel[c]}</SelectItem>)}</SelectContent></Select></Field>
                    {numInput(i, "length_cm", "Panjang (cm)")}
                    {numInput(i, "width_cm", "Lebar (cm)")}
                    {numInput(i, "height_cm", "Tinggi (cm)")}
                    {dims ? <Field label="Volume (m³)"><Input readOnly value={fmtNum(vol, 4)} aria-label="Volume dihitung" /></Field> : numInput(i, "volume_m3", "Volume total (m³)")}
                    {numInput(i, "value_idr", "Nilai barang (Rp)")}
                    <Field label="Keterangan"><Input maxLength={500} value={it.notes} onChange={(e) => setItem(i, { notes: e.target.value })} /></Field>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Total berat {fmtNum((it.qty ?? 0) * (it.weight_kg ?? 0))} kg · Volume {fmtNum(vol, 4)} m³{dims ? " (dari ukuran)" : ""}</span>
                    {items.length > 1 && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" />Hapus baris</Button>}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </Panel>
      </QueryState>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-3 py-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span><b>{totals.count}</b> barang</span><span><b>{fmtNum(totals.koli)}</b> koli</span><span><b>{fmtNum(totals.weight)}</b> kg</span><span><b>{fmtNum(totals.volume, 4)}</b> m³</span>
          {err && <p role="alert" className="w-full rounded bg-danger-soft px-3 py-2 text-destructive sm:order-last">{err}</p>}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => (id ? nav({ to: "/packing-list/$id", params: { id } }) : nav({ to: "/packing-list" }))}>Batal</Button>
            <Button disabled={busy || loading} onClick={save}>{busy ? "Menyimpan..." : "Simpan Packing List"}</Button>
          </div>
        </div>
      </div>
      {adding && <MasterDialog kind={adding.kind} row={null} onClose={() => setAdding(null)} onSaved={(newId) => set(adding.field, newId)} />}
    </main>
  );
}
