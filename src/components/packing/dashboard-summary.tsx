import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ClipboardList, Package, Scale, Ship } from "lucide-react";
import { Panel, QueryState, StatCard } from "@/components/ui-kit";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { BarsChart, DonutChart, PeriodTabs, TrendChart, VIZ } from "@/components/charts/viz";
import { fmtDate, today } from "@/lib/format";
import { mtdTrend, seriesBy, type NumberKind, type Period } from "@/lib/chart-logic";
import { PL_STATUSES, destinationTotals, fmtNum, plStatusColor, plStatusLabel, plStatusTone, plSummary, upcomingDepartures } from "@/lib/packing-logic";
import { plListQ, type PlRow } from "@/lib/packing-data";
import { cn } from "@/lib/utils";
import { PlStatusBadge } from "./shared";

const linkCls = "text-xs font-semibold text-primary hover:underline";
const glass = "viz-glass dash-reveal";
const live = (r: PlRow) => r.status !== "dibatalkan";

type Metric = "documents" | "koli" | "weight" | "volume";
const METRICS: { id: Metric; label: string; name: string; format: NumberKind; color: string }[] = [
  { id: "koli", label: "Koli", name: "Koli", format: "koli", color: VIZ.blue },
  { id: "weight", label: "Berat", name: "Berat", format: "kg", color: VIZ.cyan },
  { id: "volume", label: "Volume", name: "Volume", format: "m3", color: VIZ.teal },
  { id: "documents", label: "Dokumen", name: "Dokumen", format: "int", color: VIZ.violet },
];

/** Shipments per day/week/month/year by Packing List date; document counts include cancelled, cargo totals do not (same rule as the summary). */
function ShipmentTrend({ rows, className }: { rows: PlRow[]; className?: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const [metric, setMetric] = useState<Metric>("koli");
  const t = today();
  const m = METRICS.find((x) => x.id === metric) ?? METRICS[0]!;
  const data = useMemo(() => seriesBy(rows, period, t, (r) => r.pl_date, {
    documents: () => 1,
    koli: (r) => (live(r) ? Number(r.total_koli) : 0),
    weight: (r) => (live(r) ? Number(r.total_weight_kg) : 0),
    volume: (r) => (live(r) ? Number(r.total_volume_m3) : 0),
  }), [rows, period, t]);
  return (
    <Panel title="Tren Pengiriman" action={<PeriodTabs value={period} onChange={setPeriod} />} className={cn(glass, className)}>
      <PeriodTabs label="Pilih data" value={metric} onChange={setMetric} options={METRICS} />
      <TrendChart variant="area" data={data} format={m.format} height={250} series={[{ key: m.id, name: m.name, color: m.color }]} />
    </Panel>
  );
}

/** Packing List part of Dashboard Utama; every number is computed from rows read from the database. */
export function PackingDashboard() {
  const q = useQuery(plListQ());
  const rows = q.data ?? [];
  const s = plSummary(rows);
  const t = today();
  const deps = upcomingDepartures(rows, t).slice(0, 5);
  const dests = destinationTotals(rows).slice(0, 6);
  const tr = (f: (r: PlRow) => number) => mtdTrend(rows, (r) => r.pl_date, f, t);
  return (
    <section aria-label="Ringkasan Packing List" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Packing List</h2>
        <Link to="/packing-list" className={linkCls}>Buka Data Packing List</Link>
      </div>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <StatCard index={0} icon={ClipboardList} tone="blue" label="Total Dokumen" value={s.documents} format="int" trend={tr(() => 1)} />
          <StatCard index={1} icon={Package} tone="violet" label="Total Barang" value={s.items} format="int" trend={tr((r) => (live(r) ? Number(r.item_count) : 0))} />
          <StatCard index={2} icon={Boxes} tone="cyan" label="Total Koli" value={s.koli} format="koli" trend={tr((r) => (live(r) ? Number(r.total_koli) : 0))} />
          <StatCard index={3} icon={Scale} tone="navy" label="Total Berat" value={s.weight} format="kg" trend={tr((r) => (live(r) ? Number(r.total_weight_kg) : 0))} />
          <StatCard index={4} icon={Ship} tone="green" label="Total Volume" value={s.volume} format="m3" trend={tr((r) => (live(r) ? Number(r.total_volume_m3) : 0))} />
        </div>
        <p className="text-[11px] text-muted-foreground">Barang, koli, berat dan volume tidak menghitung Packing List yang dibatalkan. Tren membandingkan bulan ini dengan tanggal yang sama bulan lalu.</p>
        <div className="grid min-w-0 gap-4 xl:grid-cols-3">
          <ShipmentTrend rows={rows} className="xl:col-span-2" />
          <Panel title="Komposisi Status" className={glass}>
            <DonutChart format="int" data={PL_STATUSES.map((st) => ({ name: plStatusLabel[st], value: s.byStatus[st], color: plStatusColor[st] }))} />
          </Panel>
        </div>
        <Panel title="Pengiriman per Status" action={<Link to="/pengiriman" className={linkCls}>Kelola Pengiriman</Link>} className={glass}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {PL_STATUSES.map((st) => (
              <Link key={st} to="/pengiriman" search={{ status: st }} className={cn("viz-tile", plStatusTone[st])} style={{ ["--tile" as string]: plStatusColor[st] }}>
                <p className="text-xl font-extrabold tabular-nums"><AnimatedNumber value={s.byStatus[st]} format="int" /></p><p className="text-[11px] font-semibold">{plStatusLabel[st]}</p>
              </Link>
            ))}
          </div>
        </Panel>
        <div className="grid min-w-0 gap-4 xl:grid-cols-3">
          <Panel title="Top Pelabuhan Tujuan (koli)" className={glass}>
            {dests.length ? <BarsChart colorful xKey="name" format="koli" height={240} data={dests.map((d) => ({ name: d.name, koli: d.koli, detail: `${d.name} · ${d.n} PL` }))} series={[{ key: "koli", name: "Koli", color: VIZ.blue }]} />
              : <p className="py-6 text-center text-xs text-muted-foreground">Belum ada Packing List aktif</p>}
          </Panel>
          <Panel title="Jadwal Keberangkatan Kapal" action={<Link to="/manifest" className={linkCls}>Manifest Kapal</Link>} className={glass}>
            <div className="divide-y">{deps.map((g) => (
              <div key={g.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                <span className="viz-avatar w-12 text-[10px] leading-tight">{fmtDate(g.etd).slice(0, 5)}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{g.pls[0]?.vessel?.name ?? "Kapal belum ditentukan"}{g.voyage_no ? ` · V.${g.voyage_no}` : ""}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{[...new Set(g.pls.map((p) => p.destination?.name).filter(Boolean))].join(", ") || "Tujuan belum diisi"}</p></div>
                <p className="text-right text-xs"><b>{g.pls.length}</b> PL<br /><span className="text-muted-foreground">{fmtNum(g.pls.reduce((a, p) => a + Number(p.total_koli), 0))} koli</span></p>
              </div>
            ))}
              {!deps.length && <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada jadwal keberangkatan mendatang (ETD hari ini atau setelahnya)</p>}
            </div>
          </Panel>
          <Panel title="Pengiriman Terbaru" action={<Link to="/packing-list" className={linkCls}>Lihat Semua</Link>} className={glass}>
            <div className="divide-y">{rows.slice(0, 5).map((p) => (
              <Link key={p.id} to="/packing-list/$id" params={{ id: p.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md py-2.5 transition-colors hover:bg-muted/40">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.pl_number}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{fmtDate(p.pl_date)} · {p.shipper?.name ?? "-"} → {p.consignee?.name ?? "-"}</p></div>
                <PlStatusBadge s={p.status} />
              </Link>
            ))}
              {!rows.length && <p className="py-6 text-center text-xs text-muted-foreground">Belum ada Packing List</p>}
            </div>
          </Panel>
        </div>
      </QueryState>
    </section>
  );
}
