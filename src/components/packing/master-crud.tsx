// Shared add/edit/delete UI for Pengirim & Penerima, Kapal and Pelabuhan (tables pl_parties, pl_vessels, pl_ports).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { canDeletePl } from "@/lib/packing-logic";
import { deletePlRow, partiesQ, plError, portsQ, vesselsQ } from "@/lib/packing-data";
import { SearchBox, usePlRefresh } from "./shared";

type Field = { key: string; label: string; max: number; required?: boolean; multiline?: boolean };
export type MasterKind = "pengirim" | "penerima" | "kapal" | "pelabuhan";
type Row = { id: string } & Record<string, unknown>;

const partyFields: Field[] = [
  { key: "name", label: "Nama", max: 120, required: true }, { key: "company", label: "Perusahaan", max: 120 }, { key: "phone", label: "Telepon / WA", max: 40 },
  { key: "address", label: "Alamat", max: 300, multiline: true }, { key: "city", label: "Kota", max: 80 }, { key: "notes", label: "Catatan", max: 500, multiline: true },
];
export const masterConfig: Record<MasterKind, { table: "pl_parties" | "pl_vessels" | "pl_ports"; title: string; fields: Field[]; columns: string[] }> = {
  pengirim: { table: "pl_parties", title: "Pengirim", fields: partyFields, columns: ["name", "company", "phone", "city"] },
  penerima: { table: "pl_parties", title: "Penerima", fields: partyFields, columns: ["name", "company", "phone", "city"] },
  kapal: { table: "pl_vessels", title: "Kapal", columns: ["name", "operator", "call_sign"],
    fields: [{ key: "name", label: "Nama Kapal", max: 120, required: true }, { key: "operator", label: "Operator", max: 120 }, { key: "call_sign", label: "Call Sign", max: 40 }, { key: "notes", label: "Catatan", max: 500, multiline: true }] },
  pelabuhan: { table: "pl_ports", title: "Pelabuhan", columns: ["name", "city", "code"],
    fields: [{ key: "name", label: "Nama Pelabuhan", max: 120, required: true }, { key: "city", label: "Kota", max: 80 }, { key: "code", label: "Kode", max: 20 }] },
};
// One query shape for the shared table; rows are read generically by column key.
const queryFor = (k: MasterKind) => (k === "kapal" ? vesselsQ() : k === "pelabuhan" ? portsQ() : partiesQ()) as unknown as ReturnType<typeof portsQ>;

export function MasterDialog({ kind, row, onClose, onSaved }: { kind: MasterKind; row: Row | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const cfg = masterConfig[kind];
  const refresh = usePlRefresh();
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(cfg.fields.map((x) => [x.key, String(row?.[x.key] ?? "")])));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    for (const x of cfg.fields) if (x.required && !f[x.key]?.trim()) return setErr(`${x.label} wajib diisi`);
    const payload: Record<string, string | null> = Object.fromEntries(cfg.fields.map((x) => [x.key, f[x.key]?.trim().slice(0, x.max) || null]));
    if (cfg.table === "pl_parties") payload["kind"] = kind;
    setBusy(true); setErr(null);
    const table = supabase.from(cfg.table as "pl_ports");
    const r = row ? await table.update(payload as never).eq("id", row.id).select("id").single() : await table.insert(payload as never).select("id").single();
    setBusy(false);
    if (r.error) return setErr(plError(r.error));
    toast.success(`${cfg.title} ${row ? "diperbarui" : "ditambahkan"}`);
    await refresh();
    onSaved?.(r.data.id);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} {cfg.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {cfg.fields.map((x) => (
            <label key={x.key} className="block text-xs font-semibold">{x.label}{x.required && <span className="text-destructive"> *</span>}
              {x.multiline
                ? <Textarea className="mt-1" maxLength={x.max} value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
                : <Input className="mt-1" maxLength={x.max} value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />}
            </label>
          ))}
          {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MasterPanel({ kind }: { kind: MasterKind }) {
  const cfg = masterConfig[kind];
  const { role } = useAuth();
  const refresh = usePlRefresh();
  const q = useQuery(queryFor(kind));
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Row | null | "new">(null);
  const [del, setDel] = useState<Row | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const all = ((q.data ?? []) as unknown as Row[]).filter((r) => cfg.table !== "pl_parties" || r["kind"] === kind);
  const s = search.trim().toLowerCase();
  const rows = s ? all.filter((r) => cfg.columns.some((c) => String(r[c] ?? "").toLowerCase().includes(s))) : all;
  const label = (k: string) => cfg.fields.find((x) => x.key === k)?.label ?? k;
  const remove = async () => {
    if (!del) return;
    setDelBusy(true);
    try { await deletePlRow(cfg.table, del.id); toast.success(`${cfg.title} dihapus`); await refresh(); setDel(null); }
    catch (e) { toast.error(plError(e)); }
    finally { setDelBusy(false); }
  };
  const actions = (r: Row) => (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" aria-label={`Edit ${String(r["name"])}`} onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button>
      {canDeletePl(role) && <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Hapus ${String(r["name"])}`} onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></Button>}
    </div>
  );
  return (
    <Panel title={`Data ${cfg.title} (${all.length})`} action={<div className="flex flex-wrap gap-2"><SearchBox value={search} onChange={setSearch} placeholder={`Cari ${cfg.title.toLowerCase()}...`} /><Button size="sm" onClick={() => setEdit("new")}><Plus className="h-4 w-4" />Tambah {cfg.title}</Button></div>}>
      <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText={s ? "Tidak ada yang cocok dengan pencarian" : `Belum ada data ${cfg.title.toLowerCase()}`} onRetry={() => q.refetch()}>
        <div className="hidden overflow-x-auto md:block"><table className="w-full">
          <thead><tr>{cfg.columns.map((c) => <th key={c} className={th}>{label(c)}</th>)}<th className={th}>Aksi</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>{cfg.columns.map((c, i) => <td key={c} className={`${td} ${i === 0 ? "font-semibold" : ""}`}>{String(r[c] ?? "-") || "-"}</td>)}<td className={td}>{actions(r)}</td></tr>)}</tbody>
        </table></div>
        <div className="divide-y md:hidden">{rows.map((r) => (
          <article key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-3">
            <div className="min-w-0"><p className="break-words font-semibold">{String(r["name"])}</p>
              <p className="break-words text-xs text-muted-foreground">{cfg.columns.slice(1).map((c) => r[c]).filter(Boolean).join(" · ") || "-"}</p></div>
            {actions(r)}
          </article>
        ))}</div>
      </QueryState>
      {edit && <MasterDialog kind={kind} row={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${cfg.title.toLowerCase()} ${String(del?.["name"] ?? "")}?`}
        description="Data akan dihapus permanen dan tercatat di riwayat aktivitas. Data yang masih dipakai Packing List tidak dapat dihapus." confirmLabel="Ya, hapus" destructive busy={delBusy} onConfirm={remove} />
    </Panel>
  );
}
