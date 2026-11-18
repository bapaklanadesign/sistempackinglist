import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarsChart, DonutChart, PeriodTabs, TrendChart, VIZ, VizLegendStat } from "@/components/charts/viz";
import { balanceTrend, mtdTrend, rangeStart, seriesBy, type Period } from "@/lib/chart-logic";
import { cn } from "@/lib/utils";
import { TransactionActions } from "@/components/transaction-actions";
import { PageHeader } from "./_app";
import { Pager, Panel, PeriodFilter, QueryState, StatCard, StatusBadge, td, th } from "@/components/ui-kit";
import { EditTxDialog } from "@/components/edit-tx-dialog";
import { DeleteTxDialog } from "@/components/delete-tx-dialog";
import { balancesQ, monthStart, txCountQ, txQ, type Balance, type TxRow } from "@/lib/data";
import { compareBalances, ledgerTotals, matchTransactions, type Ledger } from "@/lib/ledger-logic";
import { roleLabel, useAuth } from "@/lib/auth";
import { fmtDate, rupiah, today, txTypeLabel } from "@/lib/format";
import banner from "@/assets/port-banner.jpg";
import { PackingDashboard } from "@/components/packing/dashboard-summary";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Dashboard Utama — CV MR Express" }, { name: "description", content: "Ringkasan pembukuan dan Packing List CV MR Express." }, { property: "og:title", content: "Dashboard Utama — CV MR Express" }, { property: "og:description", content: "Ringkasan pembukuan dan Packing List CV MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

const glass = "viz-glass dash-reveal";
type RecentRow = Pick<TxRow, "tx_date" | "tx_type" | "amount" | "ledger">;
const amt = (t: Pick<TxRow, "amount">) => Number(t.amount);
const net = (t: Pick<TxRow, "tx_type" | "amount">) => (t.tx_type === "income" || t.tx_type === "transfer_in" ? amt(t) : -amt(t));
const ledgerName = (l: string | null) => (l === "admin1" ? "Admin 1" : "Admin 2");
const linkCls = "text-xs font-semibold text-primary hover:underline";

function DashHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="dash-hero dash-reveal">
      <img src={banner} alt="Kapal kontainer di pelabuhan modern" width={1920} height={640} fetchPriority="high" />
      <div className="p-5 sm:p-8">
        <p className="text-[10px] font-extrabold tracking-widest opacity-90">PEMBUKUAN MR EXPRESS</p>
        <h2 className="mt-2 max-w-md text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-lg text-xs leading-relaxed opacity-90 sm:text-sm">{subtitle}</p>
      </div>
    </section>
  );
}

/** Totals come from the balances view; trends compare this month so far with the same days last month. */
function Stats({ l, rows, count, recent }: { l: Ledger; rows: Balance[]; count?: number | undefined; recent: RecentRow[] }) {
  const s = ledgerTotals(rows, l);
  const t = today();
  const mine = recent.filter((r) => r.ledger === l);
  const date = (r: RecentRow) => r.tx_date;
  const netMonth = mtdTrend(mine, date, net, t).current;
  return (
    <>
      <StatCard index={0} icon={Wallet} tone="blue" label="Total Saldo" value={s.saldo} format="rupiah" trend={{ ...balanceTrend(s.saldo, netMonth), caption: "vs awal bulan" }} />
      <StatCard index={1} icon={TrendingUp} tone="green" label="Total Pemasukan" value={s.masuk} format="rupiah" trend={mtdTrend(mine, date, (r) => (r.tx_type === "income" ? amt(r) : 0), t)} />
      <StatCard index={2} icon={TrendingDown} tone="red" label="Total Pengeluaran" value={s.keluar} format="rupiah" trend={{ ...mtdTrend(mine, date, (r) => (r.tx_type === "expense" ? amt(r) : 0), t), invert: true }} />
      <StatCard index={3} icon={Receipt} tone="navy" label="Jumlah Transaksi" value={count ?? "…"} format="int" trend={mtdTrend(mine, date, () => 1, t)} />
    </>
  );
}

function TypePill({ t }: { t: TxRow["tx_type"] }) {
  const cls = t === "income" ? "bg-success-soft text-success" : t === "expense" ? "bg-danger-soft text-destructive" : "bg-info-soft text-primary";
  return <span className={`dash-pill ${cls}`}>{txTypeLabel[t]}</span>;
}

function AccountList({ rows, ledger, isSuper }: { rows: Balance[]; ledger: Ledger | "all"; isSuper: boolean }) {
  const list = rows.filter((r) => ledger === "all" || r.ledger === ledger);
  return (
    <Panel title="Rekening" action={isSuper ? <Link to="/rekening" className={linkCls}>Lihat Semua</Link> : undefined} className={glass}>
      <div className="divide-y">
        {list.map((r) => (
          <div key={r.account_id} className="flex items-center gap-3 py-2.5">
            <span className="viz-avatar">{(r.name ?? "?").slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">{ledgerName(r.ledger)}</p>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums">{rupiah(r.balance)}</p>
          </div>
        ))}
        {!list.length && <p className="py-6 text-center text-xs text-muted-foreground">Belum ada rekening</p>}
      </div>
    </Panel>
  );
}

function RecentTx({ ledger, className }: { ledger: Ledger | "all"; className?: string }) {
  const q = useQuery(txQ({ from: monthStart(1), to: today(), ledger }));
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const rows = (q.data ?? []).slice(0, 6);
  return (
    <Panel title="Transaksi Terbaru" action={<Link to="/transaksi" className={linkCls}>Lihat Semua</Link>} className={className}>
      <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Belum ada transaksi" onRetry={() => q.refetch()}>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr>{["Tanggal", "Rekening", "Keterangan", "Jenis", "Nominal"].map((h) => <th key={h} className={th}>{h}</th>)}<th className={`${th} sticky right-0 z-10`}>Aksi</th></tr></thead>
          <tbody>{rows.map((t) => {
            const plus = t.tx_type === "income" || t.tx_type === "transfer_in";
            return (
              <tr key={t.id}>
                <td className={td}>{fmtDate(t.tx_date)}</td>
                <td className={td}>{t.bank_accounts?.name}</td>
                <td className={`${td} max-w-40 truncate`} title={t.description}>{t.description}</td>
                <td className={td}><TypePill t={t.tx_type} /></td>
                <td className={`${td} text-right font-semibold ${plus ? "text-success" : "text-destructive"}`}>{plus ? "+" : "-"}{rupiah(t.amount)}</td>
                <td className={`${td} sticky right-0 bg-card`}><TransactionActions tx={t} onEdit={setEditId} onDelete={setDelId} /></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </QueryState>
      <EditTxDialog txId={editId} onClose={() => setEditId(null)} />
      <DeleteTxDialog txId={delId} onClose={() => setDelId(null)} />
    </Panel>
  );
}

function MonthSummary({ ledger }: { ledger: Ledger | "all" }) {
  const q = useQuery(txQ({ from: monthStart(0), to: today(), ledger }));
  const { masuk, keluar } = useMemo(() => {
    const rows = q.data ?? [];
    return {
      masuk: rows.filter((t) => t.tx_type === "income").reduce((s, t) => s + amt(t), 0),
      keluar: rows.filter((t) => t.tx_type === "expense").reduce((s, t) => s + amt(t), 0),
    };
  }, [q.data]);
  const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return (
    <Panel title={`Ringkasan ${bulan}`} action={<Link to="/laporan" className={linkCls}>Lihat Detail</Link>} className={glass}>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        <DonutChart format="rupiah" data={[{ name: "Pemasukan", value: masuk, color: VIZ.cyan }, { name: "Pengeluaran", value: keluar, color: VIZ.red }]} />
        <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs"><span className="flex-1 font-semibold">Selisih</span><b className="tabular-nums">{rupiah(masuk - keluar)}</b></div>
      </QueryState>
    </Panel>
  );
}

/** Income vs expense over days, weeks, months or years; keeps the previous chart while a new period loads. */
function FlowChart({ ledger, className }: { ledger: Ledger | "all"; className?: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const t = today();
  const q = useQuery({ ...txQ({ from: rangeStart(period, t), ledger }), placeholderData: keepPreviousData });
  const data = useMemo(() => seriesBy(q.data ?? [], period, t, (r) => r.tx_date, {
    masuk: (r) => (r.tx_type === "income" ? amt(r) : 0),
    keluar: (r) => (r.tx_type === "expense" ? amt(r) : 0),
  }), [q.data, period, t]);
  const masuk = data.reduce((s, d) => s + d.masuk, 0);
  const keluar = data.reduce((s, d) => s + d.keluar, 0);
  return (
    <Panel title="Arus Keuangan" action={<PeriodTabs value={period} onChange={setPeriod} />} className={cn(glass, className)}>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        <div className={cn("grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 transition-opacity", q.isPlaceholderData && "opacity-60")}>
          <VizLegendStat color={VIZ.cyan} label="Pemasukan" value={masuk} format="rupiah" />
          <VizLegendStat color={VIZ.red} label="Pengeluaran" value={keluar} format="rupiah" />
          <VizLegendStat color={VIZ.blue} label="Selisih" value={masuk - keluar} format="rupiah" />
        </div>
        <TrendChart data={data} format="rupiah" height={250} series={[{ key: "masuk", name: "Pemasukan", color: VIZ.cyan }, { key: "keluar", name: "Pengeluaran", color: VIZ.red }]} />
      </QueryState>
    </Panel>
  );
}

function Dashboard() {
  const { role } = useAuth();
  const bal = useQuery(balancesQ());
  const counts = useQuery(txCountQ());
  const rows = bal.data ?? [];
  const isSuper = role === "super_admin";
  // Same query as "Transaksi Terbaru", so it is fetched once and reused for the trend arrows.
  const recent = useQuery(txQ({ from: monthStart(1), to: today(), ledger: isSuper ? "all" : (role as Ledger) }));
  if (isSuper) return <SuperDash bal={bal} counts={counts.data} recent={recent.data ?? []} />;
  const l = role as Ledger;
  return (
    <>
      <PageHeader title="Dashboard Utama" subtitle={`${roleLabel[l]} · Pembukuan & Packing List`} />
      <main className="dash-canvas min-w-0 space-y-4 p-3 sm:p-6">
        <DashHero title={`Dashboard ${roleLabel[l]}`} subtitle="Kelola keuangan dan pengiriman barang dengan mudah, akurat dan terintegrasi" />
        <h2 className="text-sm font-bold">Pembukuan</h2>
        <QueryState isLoading={bal.isLoading} error={bal.error} onRetry={() => bal.refetch()}>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4"><Stats l={l} rows={rows} count={counts.data?.[l]} recent={recent.data ?? []} /></div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <FlowChart ledger={l} className="xl:col-span-2" />
            <AccountList rows={rows} ledger={l} isSuper={false} />
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <RecentTx ledger={l} className={cn(glass, "xl:col-span-2")} />
            <MonthSummary ledger={l} />
          </div>
          <Panel title="Saldo Setiap Rekening" className={glass}>
            <BarsChart colorful xKey="a" format="rupiah" height={240} data={rows.filter((r) => r.ledger === l).map((r) => ({ a: r.name ?? "-", v: Number(r.balance), detail: r.name ?? "-" }))} series={[{ key: "v", name: "Saldo", color: VIZ.blue }]} />
            <div className="mt-2 grid grid-cols-2 gap-3 text-center text-[11px] sm:grid-cols-5">{rows.filter((r) => r.ledger === l).map((r) => <div key={r.account_id} className="min-w-0 break-words"><b>{r.name}</b><br />{rupiah(r.balance)}</div>)}</div>
          </Panel>
        </QueryState>
        <PackingDashboard />
      </main>
    </>
  );
}

function SuperDash({ bal, counts, recent }: { bal: ReturnType<typeof useQuery<Balance[]>>; counts?: { admin1: number; admin2: number } | undefined; recent: RecentRow[] }) {
  const rows = bal.data ?? [];
  const cmp = compareBalances(rows);
  const stat = (s: string) => cmp.filter((c) => c.status === s).length;
  return (
    <>
      <PageHeader title="Dashboard Utama" subtitle="Super Admin · Pembukuan & Packing List" />
      <main className="dash-canvas min-w-0 space-y-5 p-3 sm:p-6">
        <DashHero title="Dashboard Super Admin" subtitle="Pantau dan bandingkan pembukuan Admin 1 dan Admin 2 secara terintegrasi" />
        <QueryState isLoading={bal.isLoading} error={bal.error} onRetry={() => bal.refetch()}>
          <div className="grid min-w-0 gap-5 2xl:grid-cols-2">{(["admin1", "admin2"] as const).map((ledger) => <section key={ledger} className="min-w-0" aria-label={`Ringkasan ${roleLabel[ledger]}`}><h2 className="mb-2 text-sm font-bold">Pembukuan {roleLabel[ledger]}</h2><div className="grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4"><Stats l={ledger} rows={rows} count={counts?.[ledger]} recent={recent} /></div></section>)}</div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <Panel title="Grafik Saldo per Rekening" className={cn(glass, "xl:col-span-2")}>
              <BarsChart xKey="name" format="rupiah" height={260} data={cmp.map((c) => ({ ...c, detail: c.name }))} series={[{ key: "admin1", name: "Admin 1", color: VIZ.blue }, { key: "admin2", name: "Admin 2", color: VIZ.cyan }]} />
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--viz-blue)]" />Admin 1</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--viz-cyan)]" />Admin 2</span></div>
            </Panel>
            <AccountList rows={rows} ledger="all" isSuper />
          </div>
          <FlowChart ledger="all" />
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <RecentTx ledger="all" className={cn(glass, "xl:col-span-2")} />
            <MonthSummary ledger="all" />
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Panel title="Perbandingan Saldo Rekening" className={glass}>
              <div className="hidden overflow-x-auto md:block"><table className="w-full">
                <thead><tr>{["Rekening", "Admin 1", "Admin 2", "Selisih", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{cmp.map((c) => <tr key={c.name}><td className={td}><b>{c.name}</b></td><td className={td}>{rupiah(c.admin1)}</td><td className={td}>{rupiah(c.admin2)}</td><td className={td}>{rupiah(c.diff)}</td><td className={td}><StatusBadge s={c.status} /></td></tr>)}</tbody>
              </table></div>
              <div className="grid gap-3 sm:grid-cols-2 md:hidden">{cmp.map((c) => <div key={c.name} className="min-w-0 border-b pb-3 last:border-b-0"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><h3 className="font-bold">{c.name}</h3><StatusBadge s={c.status} /></div><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs"><dt className="text-muted-foreground">Admin 1</dt><dd className="break-words text-right font-medium tabular-nums">{rupiah(c.admin1)}</dd><dt className="text-muted-foreground">Admin 2</dt><dd className="break-words text-right font-medium tabular-nums">{rupiah(c.admin2)}</dd><dt className="text-muted-foreground">Selisih</dt><dd className="break-words text-right font-bold tabular-nums">{rupiah(c.diff)}</dd></dl></div>)}</div>
            </Panel>
            <Panel title="Status Kecocokan Saldo" className={glass}>
              <DonutChart format="int" data={[{ name: "Cocok", value: stat("Cocok"), color: VIZ.teal }, { name: "Tidak Cocok", value: stat("Tidak Cocok"), color: VIZ.red }]} />
            </Panel>
          </div>
        </QueryState>
        <PackingDashboard />
        <MatchPanel />
      </main>
    </>
  );
}

function MatchPanel() {
  const [p, setP] = useState({ from: monthStart(0), to: today() });
  const [page, setPage] = useState(1);
  const q = useQuery(txQ({ from: p.from, to: p.to }));
  const m = useMemo(() => matchTransactions((q.data ?? []).filter((t) => t.tx_type === "income" || t.tx_type === "expense") as TxRow[] as never), [q.data]);
  const pages = Math.max(1, Math.ceil(m.length / 20));
  const cell = (t: TxRow | null) => (t ? `${t.description} · ${rupiah(t.amount)}` : "—");
  return (
    <Panel title="Pencocokan Transaksi Admin 1 vs Admin 2" action={<PeriodFilter from={p.from} to={p.to} onChange={(v) => { setP(v); setPage(1); }} />} className={glass}>
      <p className="mb-2 text-xs text-muted-foreground">Dicocokkan berdasarkan tanggal, rekening, jenis dan nominal. {m.filter((x) => x.status === "Cocok").length} cocok, {m.filter((x) => x.status !== "Cocok").length} belum ada pasangan.</p>
      <QueryState isLoading={q.isLoading} error={q.error} empty={m.length === 0} emptyText="Belum ada transaksi pada periode ini" onRetry={() => q.refetch()}>
        <div className="hidden overflow-x-auto md:block"><table className="w-full">
          <thead><tr>{["Tanggal", "Rekening", "Jenis", "Admin 1", "Admin 2", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{m.slice((page - 1) * 20, page * 20).map((x, i) => { const row = x.a1 ?? x.a2; if (!row) return null; const t = row as unknown as TxRow; return (
            <tr key={i}><td className={td}>{fmtDate(t.tx_date)}</td><td className={td}>{t.bank_accounts?.name}</td><td className={td}>{txTypeLabel[t.tx_type]}</td><td className={td}>{cell(x.a1 as unknown as TxRow)}</td><td className={td}>{cell(x.a2 as unknown as TxRow)}</td><td className={td}><StatusBadge s={x.status} /></td></tr>
          ); })}</tbody>
        </table></div>
        <div className="space-y-3 md:hidden">{m.slice((page - 1) * 20, page * 20).map((x, i) => { const row = x.a1 ?? x.a2; if (!row) return null; const t = row as unknown as TxRow; return <article key={i} className="min-w-0 border-b pb-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><p className="min-w-0 text-xs font-semibold">{fmtDate(t.tx_date)} · {t.bank_accounts?.name}</p><StatusBadge s={x.status} /></div><p className="mt-1 text-xs text-muted-foreground">{txTypeLabel[t.tx_type]}</p><dl className="mt-2 space-y-2 text-xs">{(["a1", "a2"] as const).map((key) => <div key={key}><dt className="font-semibold">{key === "a1" ? "Admin 1" : "Admin 2"}</dt><dd className="mt-0.5 break-words leading-relaxed text-muted-foreground">{cell(x[key] as unknown as TxRow | null)}</dd></div>)}</dl></article>; })}</div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </QueryState>
    </Panel>
  );
}
