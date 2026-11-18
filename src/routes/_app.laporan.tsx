import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { TransactionActions } from "@/components/transaction-actions";
import { PageHeader } from "./_app";
import { Pager, Panel, PeriodFilter, QueryState, StatCard, td, th } from "@/components/ui-kit";
import { EditTxDialog } from "@/components/edit-tx-dialog";
import { DeleteTxDialog } from "@/components/delete-tx-dialog";
import { ReviewBadge, ReviewSelect, reviewLabel, type ReviewStatus } from "@/components/review-status";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { balancesQ, monthStart, txQ } from "@/lib/data";
import { useAuth, type Ledger } from "@/lib/auth";
import { errMsg, fmtDate, rupiah, today, txTypeLabel } from "@/lib/format";
import { exportExcel, exportLaporanMatrix, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/_app/laporan")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Laporan — CV MR Express" }, { name: "description", content: "Laporan pembukuan gabungan dan per admin." }, { property: "og:title", content: "Laporan — CV MR Express" }, { property: "og:description", content: "Laporan pembukuan gabungan dan per admin." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const ACCS = ["BCA", "BRI", "Mandiri", "BNI", "MDU"];
const ledgerName = (l: string) => (l === "admin1" ? "Admin 1" : "Admin 2");

function Page() {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const [p, setP] = useState({ from: monthStart(0), to: today() });
  const [ledger, setLedger] = useState<Ledger | "all">("all");
  const [acc, setAcc] = useState("all");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const q = useQuery(txQ({ ...p, ledger, accountName: acc }));
  const bal = useQuery(balancesQ());
  const all = q.data ?? [];
  const rows = status === "all" ? all : all.filter((t) => t.review_status === status);
  const pages = Math.max(1, Math.ceil(rows.length / 50));

  const groups = useMemo(() => {
    const keys = [...new Set(all.map((t) => `${t.ledger}|${t.bank_accounts?.name}`))].sort();
    return keys.map((k) => {
      const [l = "", name = ""] = k.split("|"); const r = all.filter((t) => `${t.ledger}|${t.bank_accounts?.name}` === k);
      const s = (types: string[]) => r.filter((t) => types.includes(t.tx_type)).reduce((a, t) => a + Number(t.amount), 0);
      return { l, name, masuk: s(["income"]), keluar: s(["expense"]), tin: s(["transfer_in"]), tout: s(["transfer_out"]), n: r.length };
    });
  }, [all]);
  const tot = groups.reduce((a, g) => ({ masuk: a.masuk + g.masuk, keluar: a.keluar + g.keluar }), { masuk: 0, keluar: 0 });
  const saldo = (bal.data ?? []).filter((b) => (ledger === "all" || b.ledger === ledger) && (acc === "all" || b.name === acc)).reduce((s, b) => s + Number(b.balance ?? 0), 0);
  const counts = { unchecked: 0, match: 0, mismatch: 0 } as Record<ReviewStatus, number>;
  all.forEach((t) => { counts[t.review_status]++; });
  const title = `Laporan ${isSuper ? (ledger === "all" ? "Gabungan" : ledgerName(ledger)) : ""} ${p.from} sd ${p.to}`.replace(/\s+/g, " ");
  const summary: [string, string][] = [["Saldo Saat Ini", rupiah(saldo)], ["Total Pemasukan", rupiah(tot.masuk)], ["Total Pengeluaran", rupiah(tot.keluar)], ["Selisih", rupiah(tot.masuk - tot.keluar)]];
  const reset = () => setPage(1);

  return (
    <>
      <PageHeader title={isSuper ? "Laporan Gabungan" : "Laporan"}>
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => (isSuper ? exportLaporanMatrix(rows, title, bal.data ?? []) : exportExcel(rows, title)).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" />Excel</Button>
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportPdf(rows, title, summary).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" />PDF</Button>
      </PageHeader>
      <main className="space-y-4 p-4">
        <Panel title="Filter" action={<div className="flex flex-wrap gap-2">
          <PeriodFilter from={p.from} to={p.to} onChange={(v) => { setP(v); reset(); }} />
          {isSuper && <Select value={ledger} onValueChange={(v) => { setLedger(v as Ledger | "all"); reset(); }}><SelectTrigger aria-label="Admin" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Admin</SelectItem><SelectItem value="admin1">Admin 1</SelectItem><SelectItem value="admin2">Admin 2</SelectItem></SelectContent></Select>}
          <Select value={acc} onValueChange={(v) => { setAcc(v); reset(); }}><SelectTrigger aria-label="Rekening" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Rekening</SelectItem>{ACCS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
          {isSuper && <Select value={status} onValueChange={(v) => { setStatus(v as ReviewStatus | "all"); reset(); }}><SelectTrigger aria-label="Status" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Status</SelectItem>{(Object.keys(reviewLabel) as ReviewStatus[]).map((k) => <SelectItem key={k} value={k}>{reviewLabel[k]}</SelectItem>)}</SelectContent></Select>}
        </div>}>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
            <StatCard compact index={0} icon={Wallet} tone="blue" label="Saldo Saat Ini" value={saldo} format="rupiah" />
            <StatCard compact index={1} icon={TrendingUp} tone="green" label="Total Pemasukan" value={tot.masuk} format="rupiah" />
            <StatCard compact index={2} icon={TrendingDown} tone="red" label="Total Pengeluaran" value={tot.keluar} format="rupiah" />
            <StatCard compact index={3} icon={Scale} tone="navy" label="Selisih" value={tot.masuk - tot.keluar} format="rupiah" />
          </div>
          {isSuper && <p className="mt-3 text-xs">Belum Diperiksa: <b>{counts.unchecked}</b> · Cocok: <b className="text-success">{counts.match}</b> · Tidak Cocok: <b className="text-destructive">{counts.mismatch}</b></p>}
        </Panel>

        <Panel title="Ringkasan per Rekening">
          <QueryState isLoading={q.isLoading} error={q.error} empty={!groups.length} emptyText="Tidak ada transaksi pada periode ini" onRetry={() => q.refetch()}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{[...(isSuper ? ["Admin"] : []), "Rekening", "Pemasukan", "Pengeluaran", "Transfer Masuk", "Transfer Keluar", "Jumlah"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{groups.map((g) => <tr key={g.l + g.name}>{isSuper && <td className={td}>{ledgerName(g.l)}</td>}<td className={td}><b>{g.name}</b></td><td className={td}>{rupiah(g.masuk)}</td><td className={td}>{rupiah(g.keluar)}</td><td className={td}>{rupiah(g.tin)}</td><td className={td}>{rupiah(g.tout)}</td><td className={td}>{g.n}</td></tr>)}</tbody>
            </table></div>
          </QueryState>
        </Panel>

        <Panel title={`Transaksi (${rows.length})`}>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Tidak ada transaksi pada filter ini" onRetry={() => q.refetch()}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{["Tanggal", ...(isSuper ? ["Admin"] : []), "Rekening", "Jenis", "Keterangan", "Nominal", "Status"].map((h, i) => <th key={i} className={th}>{h}</th>)}<th className={`${th} sticky right-0 z-10`}>Aksi</th></tr></thead>
              <tbody>{rows.slice((page - 1) * 50, page * 50).map((t) => {
                const plus = t.tx_type === "income" || t.tx_type === "transfer_in";
                return (
                  <tr key={t.id}>
                    <td className={td}>{fmtDate(t.tx_date)}</td>
                    {isSuper && <td className={td}>{ledgerName(t.ledger)}</td>}
                    <td className={td}>{t.bank_accounts?.name}</td><td className={td}>{txTypeLabel[t.tx_type]}</td>
                    <td className={`${td} max-w-xs truncate`} title={t.description}>{t.description}</td>
                    <td className={`${td} text-right font-semibold ${plus ? "text-success" : "text-destructive"}`}>{plus ? "+" : "-"}{rupiah(t.amount)}</td>
                    <td className={td}>{isSuper ? <ReviewSelect id={t.id} status={t.review_status} /> : <ReviewBadge status={t.review_status} />}</td>
                    <td className={`${td} sticky right-0 bg-card`}><TransactionActions tx={t} onEdit={setEditId} onDelete={setDelId} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
            <Pager page={page} pages={pages} onPage={setPage} />
          </QueryState>
        </Panel>
      </main>
      <EditTxDialog txId={editId} onClose={() => setEditId(null)} />
      <DeleteTxDialog txId={delId} onClose={() => setDelId(null)} />
    </>
  );
}
