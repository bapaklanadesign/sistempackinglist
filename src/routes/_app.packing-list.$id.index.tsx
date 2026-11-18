import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Printer, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PlStatusBadge, StatusDialog, plMeta, usePlRefresh, usePrintPl } from "@/components/packing/shared";
import { PlActivityList } from "@/components/packing/activity";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { canDeletePl, conditionLabel, fmtNum, plStatusLabel, unitLabel } from "@/lib/packing-logic";
import { deletePlRow, plDetailQ, plError, type PlRow } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/packing-list/$id/")({
  head: () => plMeta("Detail Packing List", "Rincian dokumen Packing List, barang dan riwayat status."),
  component: Page,
});

const d = (s: string | null) => (s ? fmtDate(s) : "-");
const partyText = (p: PlRow["shipper"]) => (p ? [p.company, p.address, p.city, p.phone].filter(Boolean).join(" · ") : "");

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="break-words text-sm font-semibold">{value || "-"}</dd></div>;
}

function Page() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const nav = useNavigate();
  const refresh = usePlRefresh();
  const q = useQuery(plDetailQ(id));
  const { print, busyId } = usePrintPl();
  const [statusOpen, setStatusOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const pl = q.data;
  const remove = async () => {
    if (!pl) return;
    setDelBusy(true);
    try { await deletePlRow("pl_packing_lists", pl.id); toast.success(`${pl.pl_number} dihapus`); await refresh(); nav({ to: "/packing-list" }); }
    catch (e) { toast.error(plError(e)); setDelBusy(false); }
  };
  return (
    <>
      <PageHeader title={pl?.pl_number ?? "Detail Packing List"} {...(pl ? { subtitle: `Status: ${plStatusLabel[pl.status]}` } : {})}>
        {pl && <>
          <Button asChild size="sm" variant="outline"><Link to="/packing-list/$id/edit" params={{ id }}><Pencil className="h-4 w-4" />Edit</Link></Button>
          <Button size="sm" variant="outline" onClick={() => setStatusOpen(true)}><RefreshCw className="h-4 w-4" />Ubah Status</Button>
          <Button size="sm" onClick={() => print(id)} disabled={busyId === id}><Printer className="h-4 w-4" />{busyId === id ? "Menyiapkan..." : "Cetak PDF"}</Button>
          {canDeletePl(role) && <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDelOpen(true)}><Trash2 className="h-4 w-4" />Hapus</Button>}
        </>}
      </PageHeader>
      <main className="min-w-0 space-y-4 p-3 sm:p-6">
        <Link to="/packing-list" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Kembali ke Data Packing List</Link>
        <QueryState isLoading={q.isLoading} error={q.error} empty={!pl} emptyText="Packing List tidak ditemukan atau sudah dihapus" onRetry={() => q.refetch()}>
          {pl && <>
            <Panel title="Informasi Pengiriman" action={<PlStatusBadge s={pl.status} />}>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Info label="Tanggal" value={d(pl.pl_date)} />
                <Info label="Kapal / Voyage" value={`${pl.vessel?.name ?? "-"}${pl.voyage_no ? ` · V.${pl.voyage_no}` : ""}`} />
                <Info label="Pelabuhan Asal" value={pl.origin?.name} />
                <Info label="Pelabuhan Tujuan" value={pl.destination?.name} />
                <Info label="ETD" value={d(pl.etd)} /><Info label="ETA" value={d(pl.eta)} />
                <Info label="No. Kontainer" value={pl.container_no} /><Info label="No. Segel" value={pl.seal_no} />
              </dl>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3"><p className="text-[11px] font-bold text-muted-foreground">PENGIRIM</p><p className="font-semibold">{pl.shipper?.name}</p><p className="break-words text-xs text-muted-foreground">{partyText(pl.shipper)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-[11px] font-bold text-muted-foreground">PENERIMA</p><p className="font-semibold">{pl.consignee?.name}</p><p className="break-words text-xs text-muted-foreground">{partyText(pl.consignee)}</p></div>
              </div>
              {pl.notes && <p className="mt-3 break-words rounded bg-muted p-3 text-xs">Catatan: {pl.notes}</p>}
            </Panel>
            <Panel title={`Barang (${pl.item_count})`}>
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[["Total Koli", fmtNum(pl.total_koli)], ["Total Berat", `${fmtNum(pl.total_weight_kg)} kg`], ["Total Volume", `${fmtNum(pl.total_volume_m3, 4)} m³`], ["Total Nilai", `Rp ${fmtNum(pl.total_value)}`]].map(([k, v]) => <div key={k} className="rounded border p-2"><p className="text-muted-foreground">{k}</p><b>{v}</b></div>)}
              </div>
              <div className="hidden overflow-x-auto md:block"><table className="w-full">
                <thead><tr>{["No", "Nama Barang", "Jumlah", "Berat/Sat", "Total Berat", "Ukuran (cm)", "Volume (m³)", "Nilai", "Kondisi", "Keterangan"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{pl.items.map((i) => <tr key={i.id}>
                  <td className={td}>{i.line_no}</td><td className={`${td} font-semibold`}>{i.name}</td><td className={td}>{fmtNum(i.qty)} {unitLabel[i.unit] ?? i.unit}</td>
                  <td className={td}>{fmtNum(i.weight_kg)} kg</td><td className={td}>{fmtNum(Number(i.qty) * Number(i.weight_kg))} kg</td>
                  <td className={td}>{i.length_cm && i.width_cm && i.height_cm ? `${fmtNum(i.length_cm)}×${fmtNum(i.width_cm)}×${fmtNum(i.height_cm)}` : "-"}</td>
                  <td className={td}>{fmtNum(i.volume_m3, 4)}</td><td className={td}>{i.value_idr == null ? "-" : `Rp ${fmtNum(i.value_idr)}`}</td>
                  <td className={td}>{conditionLabel[i.condition] ?? i.condition}</td><td className={`${td} max-w-48 truncate`} title={i.notes ?? ""}>{i.notes ?? "-"}</td>
                </tr>)}</tbody>
              </table></div>
              <div className="divide-y md:hidden">{pl.items.map((i) => <article key={i.id} className="py-2 text-xs">
                <p className="break-words text-sm font-semibold">{i.line_no}. {i.name}</p>
                <p className="text-muted-foreground">{fmtNum(i.qty)} {unitLabel[i.unit] ?? i.unit} · {fmtNum(Number(i.qty) * Number(i.weight_kg))} kg · {fmtNum(i.volume_m3, 4)} m³ · {conditionLabel[i.condition] ?? i.condition}</p>
                {i.notes && <p className="break-words text-muted-foreground">{i.notes}</p>}
              </article>)}</div>
            </Panel>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <Panel title="Riwayat Status">
                <ol className="space-y-3">{pl.history.map((h) => <li key={h.id} className="border-l-2 border-primary pl-3 text-xs">
                  <p className="flex flex-wrap items-center gap-1">{h.from_status && <><PlStatusBadge s={h.from_status} />→</>}<PlStatusBadge s={h.to_status} /></p>
                  <p className="mt-1 text-muted-foreground">{fmtDateTime(h.changed_at)} · {h.changed_by_name ?? "-"}</p>
                  {h.note && <p className="break-words">Catatan: {h.note}</p>}
                </li>)}</ol>
                {!pl.history.length && <p className="text-xs text-muted-foreground">Belum ada riwayat status.</p>}
              </Panel>
              <Panel title="Riwayat Aktivitas"><PlActivityList packingListId={id} compact /></Panel>
            </div>
          </>}
        </QueryState>
      </main>
      <StatusDialog pl={statusOpen && pl ? pl : null} onClose={() => setStatusOpen(false)} />
      <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title={`Hapus ${pl?.pl_number ?? ""}?`} description="Packing List beserta seluruh barang dan riwayat statusnya akan dihapus permanen. Penghapusan tercatat di riwayat aktivitas." confirmLabel="Ya, hapus" destructive busy={delBusy} onConfirm={remove} />
    </>
  );
}
