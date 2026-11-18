import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { TransactionActions } from "@/components/transaction-actions";
import { DeleteTxDialog } from "@/components/delete-tx-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { balancesQ, monthStart, txQ } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { fmtDate, parseAmount, rupiah, today } from "@/lib/format";

export const Route = createFileRoute("/_app/transfer")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Transfer Antar Rekening — CV MR Express" }, { name: "description", content: "Transfer saldo antar rekening internal." }, { property: "og:title", content: "Transfer — CV MR Express" }, { property: "og:description", content: "Transfer saldo antar rekening internal." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const bal = useQuery(balancesQ());
  const hist = useQuery(txQ({ from: monthStart(2) }));
  const mine = (bal.data ?? []).filter((b) => b.ledger === role);
  const blank = () => ({ from: "", to: "", amount: "", date: today(), note: "", ref: crypto.randomUUID() });
  const [f, setF] = useState(blank);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const name = (id: string) => mine.find((b) => b.account_id === id)?.name ?? "-";
  const amount = parseAmount(f.amount);

  const check = () => {
    if (!f.from || !f.to) return setErr("Pilih rekening asal dan tujuan");
    if (f.from === f.to) return setErr("Rekening asal dan tujuan harus berbeda");
    if (amount === null) return setErr("Nominal tidak valid");
    const saldo = Number(mine.find((b) => b.account_id === f.from)?.balance ?? 0);
    if (saldo < amount) return setErr(`Saldo ${name(f.from)} tidak cukup (${rupiah(saldo)})`);
    setErr(null); setConfirm(true);
  };
  const send = async () => {
    if (amount === null) return setErr("Nominal tidak valid");
    setBusy(true);
    const { error } = await supabase.rpc("create_transfer", { p_from: f.from, p_to: f.to, p_amount: amount, p_date: f.date, p_note: f.note, p_client_ref: f.ref });
    setBusy(false); setConfirm(false);
    if (error) return setErr(error.message);
    toast.success("Transfer berhasil");
    qc.invalidateQueries({ queryKey: ["transactions"] }); qc.invalidateQueries({ queryKey: ["balances"] });
    setF(blank());
  };
  const transfers = (hist.data ?? []).filter((t) => t.tx_type === "transfer_out");
  const pair = (tid: string | null) => hist.data?.find((t) => t.transfer_id === tid && t.tx_type === "transfer_in")?.bank_accounts?.name ?? "-";

  return (
    <>
      <PageHeader title="Transfer Antar Rekening" />
      <main className="grid min-w-0 gap-4 p-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel title="Transfer Baru">
          <QueryState isLoading={bal.isLoading} error={bal.error} onRetry={() => bal.refetch()}>
            {!confirm ? (
              <div className="space-y-3">
                {(["from", "to"] as const).map((k) => (
                  <Select key={k} value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}>
                    <SelectTrigger aria-label={k === "from" ? "Rekening asal" : "Rekening tujuan"}><SelectValue placeholder={k === "from" ? "Dari rekening" : "Ke rekening"} /></SelectTrigger>
                    <SelectContent>{mine.map((b) => b.account_id ? <SelectItem key={b.account_id} value={b.account_id}>{b.name} — {rupiah(b.balance)}</SelectItem> : null)}</SelectContent>
                  </Select>
                ))}
                <Input placeholder="Nominal" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
                <Input type="date" aria-label="Tanggal" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
                <Input placeholder="Catatan (opsional)" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
                {err && <p role="alert" className="rounded bg-danger-soft px-3 py-2 text-xs text-destructive">{err}</p>}
                <Button className="w-full" onClick={check}>Lanjutkan</Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p>Konfirmasi transfer <b>{rupiah(amount)}</b> dari <b>{name(f.from)}</b> ke <b>{name(f.to)}</b> pada {fmtDate(f.date)}?</p>
                <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirm(false)}>Batal</Button><Button className="flex-1" disabled={busy} onClick={send}>{busy ? "Memproses..." : "Konfirmasi"}</Button></div>
              </div>
            )}
          </QueryState>
        </Panel>
        <Panel title="Riwayat Transfer (3 bulan)">
          <QueryState isLoading={hist.isLoading} error={hist.error} empty={!transfers.length} emptyText="Belum ada transfer" onRetry={() => hist.refetch()}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr>{["Tanggal", "Dari", "Ke", "Catatan", "Nominal"].map((h) => <th key={h} className={th}>{h}</th>)}<th className={`${th} sticky right-0 z-10`}>Aksi</th></tr></thead>
              <tbody>{transfers.map((t) => <tr key={t.id}><td className={td}>{fmtDate(t.tx_date)}</td><td className={td}>{t.bank_accounts?.name}</td><td className={td}>{pair(t.transfer_id)}</td><td className={td}>{t.description}</td><td className={td}>{rupiah(t.amount)}</td><td className={`${td} sticky right-0 bg-card`}><TransactionActions tx={t} onDelete={setDelId} /></td></tr>)}</tbody>
            </table></div>
          </QueryState>
        </Panel>
      </main>
      <DeleteTxDialog txId={delId} onClose={() => setDelId(null)} />
    </>
  );
}
