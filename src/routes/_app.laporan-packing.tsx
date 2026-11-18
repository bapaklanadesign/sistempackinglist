import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, ClipboardList, Download, Package, Scale, Ship } from "lucide-react";
import { PageHeader } from "./_app";
import { Panel, PeriodFilter, QueryState, StatCard, td, th } from "@/components/ui-kit";
import { BarsChart, DonutChart, VIZ } from "@/components/charts/viz";
import { Button } from "@/components/ui/button";
import { PlStatusBadge, plMeta } from "@/components/packing/shared";
import { PlActivityList } from "@/components/packing/activity";
import { monthStart } from "@/lib/data";
import { today } from "@/lib/format";
import { PL_STATUSES, destinationTotals, fmtNum, plStatusColor, plStatusLabel, plSummary } from "@/lib/packing-logic";
import { plError, plListQ } from "@/lib/packing-data";
import { exportPlExcel } from "@/lib/packing-export";

export const Route = createFileRoute("/_app/laporan-packing")({
  head: () => plMeta("Laporan & Aktivitas Packing List", "Laporan pengiriman dan riwayat aktivitas Packing List."),
  component: Page,
});

function Page() {
  const q = useQuery(plListQ());
  const [p, setP] = useState({ from: monthStart(0), to: today() });
  const rows = useMemo(() => (q.data ?? []).filter((x) => (!p.from || x.pl_date >= p.from) && (!p.to || x.pl_date <= p.to)), [q.data, p]);
  const sum = plSummary(rows);
  const byDest = useMemo(() => destinationTotals(rows), [rows]);
  const title = `Laporan Packing List ${p.from} sd ${p.to}`;
  return (
    <>
      <PageHeader title="Laporan & Aktivitas" subtitle="Rekap Packing List per periode dan riwayat aktivitas tim">
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportPlExcel(rows, title).catch((e) => toast.error(plError(e)))}><Download className="h-4 w-4" />Excel</Button>
      </PageHeader>
      <main className="dash-canvas min-w-0 space-y-4 p-3 sm:p-6">
        <Panel title="Ringkasan Periode" className="viz-glass" action={<PeriodFilter from={p.from} to={p.to} onChange={setP} />}>
          <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <StatCard compact index={0} icon={ClipboardList} tone="blue" label="Dokumen" value={sum.documents} format="int" />
              <StatCard compact index={1} icon={Package} tone="violet" label="Barang" value={sum.items} format="int" />
              <StatCard compact index={2} icon={Boxes} tone="cyan" label="Koli" value={sum.koli} format="koli" />
              <StatCard compact index={3} icon={Scale} tone="navy" label="Berat" value={sum.weight} format="kg" />
              <StatCard compact index={4} icon={Ship} tone="green" label="Volume" value={sum.volume} format="m3" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Barang, koli, berat dan volume tidak menghitung Packing List yang dibatalkan.</p>
            <div className="mt-3 flex flex-wrap gap-2">{PL_STATUSES.map((s) => <span key={s} className="flex items-center gap-1 text-xs"><PlStatusBadge s={s} /><b>{sum.byStatus[s]}</b></span>)}</div>
          </QueryState>
        </Panel>
        <div className="grid min-w-0 gap-4 xl:grid-cols-3">
          <Panel title="Koli per Pelabuhan Tujuan" className="viz-glass dash-reveal xl:col-span-2">
            <QueryState isLoading={q.isLoading} error={q.error} empty={!byDest.length} emptyText="Tidak ada Packing List pada periode ini">
              <BarsChart colorful xKey="name" format="koli" height={250} data={byDest.slice(0, 10).map((d) => ({ name: d.name, koli: d.koli, detail: `${d.name} · ${d.n} PL` }))} series={[{ key: "koli", name: "Koli", color: VIZ.blue }]} />
            </QueryState>
          </Panel>
          <Panel title="Status pada Periode" className="viz-glass dash-reveal">
            <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Tidak ada Packing List pada periode ini">
              <DonutChart format="int" data={PL_STATUSES.map((st) => ({ name: plStatusLabel[st], value: sum.byStatus[st], color: plStatusColor[st] }))} />
            </QueryState>
          </Panel>
        </div>
        <Panel title="Rekap per Pelabuhan Tujuan">
          <QueryState isLoading={q.isLoading} error={q.error} empty={!byDest.length} emptyText="Tidak ada Packing List pada periode ini">
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{["Tujuan", "Dokumen", "Koli", "Berat (kg)", "Volume (m³)"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{byDest.map((g) => <tr key={g.name}><td className={`${td} font-semibold`}>{g.name}</td><td className={td}>{g.n}</td><td className={td}>{fmtNum(g.koli)}</td><td className={td}>{fmtNum(g.w)}</td><td className={td}>{fmtNum(g.v, 4)}</td></tr>)}</tbody>
            </table></div>
          </QueryState>
        </Panel>
        <Panel title="Riwayat Aktivitas Packing List"><PlActivityList /></Panel>
      </main>
    </>
  );
}
