import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { TransactionActions } from "@/components/transaction-actions";
import { PageHeader } from "./_app";
import { Pager, Panel, PeriodFilter, QueryState, td, th } from "@/components/ui-kit";
import { EditTxDialog } from "@/components/edit-tx-dialog";
import { DeleteTxDialog } from "@/components/delete-tx-dialog";
import { ReviewBadge, ReviewSelect } from "@/components/review-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { accountsQ, monthStart, txQ } from "@/lib/data";
import { useAuth, type Ledger } from "@/lib/auth";
import { errMsg, fmtDate, parseAmount, rupiah, today, txTypeLabel } from "@/lib/format";
import { exportExcel, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/_app/transaksi")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Transaksi — CV MR Express" }, { name: "description", content: "Daftar dan input transaksi pembukuan." }, { property: "og:title", content: "Transaksi — CV MR Express" }, { property: "og:description", content: "Daftar dan input transaksi pembukuan." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const ACCS = ["BCA", "BRI", "Mandiri", "BNI", "MDU"];

function Page() {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const [p, setP] = useState({ from: monthStart(0), to: today() });
  const [ledger, setLedger] = useState<Ledger | "all">("all");
  const [acc, setAcc] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const q = useQuery(txQ({ ...p, ledger, accountName: acc, ...(search.trim() ? { q: search.trim() } : {}) }));
  const rows = q.data ?? [];
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const totals = useMemo(() => ({
    in: rows.filter((t) => t.tx_type === "income" || t.tx_type === "transfer_in").reduce((s, t) => s + Number(t.amount), 0),
    out: rows.filter((t) => t.tx_type === "expense" || t.tx_type === "transfer_out").reduce((s, t) => s + Number(t.amount), 0),
  }), [rows]);
  const title = `Transaksi ${p.from} sd ${p.to}`;

  return (
    <>
      <PageHeader title={isSuper ? "Semua Transaksi" : "Transaksi"}>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Tambah</Button>
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportExcel(rows, title).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" />Excel</Button>
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => exportPdf(rows, title, [["Masuk", rupiah(totals.in)], ["Keluar", rupiah(totals.out)]]).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" />PDF</Button>
      </PageHeader>
      <main className="p-4">
        <Panel title="Daftar Transaksi" action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter from={p.from} to={p.to} onChange={(v) => { setP(v); setPage(1); }} />
            {isSuper && <Select value={ledger} onValueChange={(v) => { setLedger(v as Ledger | "all"); setPage(1); }}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="admin1">Admin 1</SelectItem><SelectItem value="admin2">Admin 2</SelectItem></SelectContent></Select>}
            <Select value={acc} onValueChange={(v) => { setAcc(v); setPage(1); }}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Rekening</SelectItem>{ACCS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            <Input className="h-8 w-40 text-xs" placeholder="Cari keterangan" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        }>
          <p className="mb-2 text-xs">Masuk: <b className="text-success">{rupiah(totals.in)}</b> · Keluar: <b className="text-destructive">{rupiah(totals.out)}</b> · {rows.length} transaksi</p>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Belum ada transaksi pada filter ini" onRetry={() => q.refetch()}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{["Tanggal", ...(isSuper ? ["Pembukuan"] : []), "Rekening", "Jenis", "Keterangan", "Kategori", "Nominal", "Status"].map((h, i) => <th key={i} className={th}>{h}</th>)}<th className={`${th} sticky right-0 z-10`}>Aksi</th></tr></thead>
              <tbody>{rows.slice((page - 1) * 50, page * 50).map((t) => {
                const plus = t.tx_type === "income" || t.tx_type === "transfer_in";
                return (
                  <tr key={t.id}>
                    <td className={td}>{fmtDate(t.tx_date)}</td>
                    {isSuper && <td className={td}>{t.ledger === "admin1" ? "Admin 1" : "Admin 2"}</td>}
                    <td className={td}>{t.bank_accounts?.name}</td><td className={td}>{txTypeLabel[t.tx_type]}</td>
                    <td className={`${td} max-w-xs truncate`} title={t.description}>{t.description}</td><td className={td}>{t.category ?? "-"}</td>
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
      {adding && <AddTxDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function AddTxDialog({ onClose }: { onClose: () => void }) {
  const { role } = useAuth();
  const isSuper = role === "super_admin";
  const qc = useQueryClient();
  const accounts = useQuery(accountsQ());
  const blank = () => ({ ledger: (isSuper ? "admin1" : role) as Ledger, account_id: "", tx_date: today(), description: "", tx_type: "income" as "income" | "expense", amount: "", category: "", ref: crypto.randomUUID() });
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = accounts.data?.filter((a) => a.ledger === f.ledger) ?? [];

  const save = async () => {
    const amount = parseAmount(f.amount);
    if (!f.account_id) return setErr("Pilih rekening");
    if (!f.description.trim()) return setErr("Keterangan wajib diisi");
    if (amount === null) return setErr("Nominal tidak valid");
    setBusy(true); setErr(null);
    const error = isSuper
      ? (await supabase.rpc("create_transaction", {
          p_ledger: f.ledger, p_account_id: f.account_id, p_date: f.tx_date, p_description: f.description.trim().slice(0, 200),
          p_type: f.tx_type, p_amount: amount, p_category: f.category.trim(), p_client_ref: f.ref,
        })).error
      : (await supabase.from("transactions").insert({
          ledger: f.ledger, account_id: f.account_id, tx_date: f.tx_date, description: f.description.trim().slice(0, 200), tx_type: f.tx_type, amount,
          category: f.category.trim() || null, client_ref: f.ref,
        })).error;
    setBusy(false);
    if (error && error.code !== "23505") return setErr(error.message);
    toast.success("Transaksi tersimpan");
    qc.invalidateQueries({ queryKey: ["transactions"] }); qc.invalidateQueries({ queryKey: ["balances"] }); qc.invalidateQueries({ queryKey: ["audit"] });
    setF(blank()); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah Transaksi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" aria-label="Tanggal" value={f.tx_date} onChange={(e) => setF({ ...f, tx_date: e.target.value })} />
            {isSuper && <Select value={f.ledger} onValueChange={(v) => setF({ ...f, ledger: v as Ledger, account_id: "" })}><SelectTrigger aria-label="Pembukuan"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="admin1">Admin 1</SelectItem><SelectItem value="admin2">Admin 2</SelectItem></SelectContent></Select>}
            <Select value={f.account_id} onValueChange={(v) => setF({ ...f, account_id: v })}><SelectTrigger aria-label="Rekening"><SelectValue placeholder="Rekening" /></SelectTrigger>
              <SelectContent>{mine.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <Select value={f.tx_type} onValueChange={(v) => setF({ ...f, tx_type: v as "income" })}><SelectTrigger aria-label="Jenis"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent></Select>
          <Input placeholder="Keterangan" maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input placeholder="Nominal (mis. 1.500.000)" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <Input placeholder="Kategori (opsional)" maxLength={50} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Transaksi"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
