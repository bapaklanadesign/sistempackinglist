import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "./_app";
import { Panel, QueryState, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { accountsQ, importsQ } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { parseImportRow, type ImportRow } from "@/lib/ledger-logic";
import { errMsg, fmtDate, fmtDateTime, rupiah, txTypeLabel } from "@/lib/format";

export const Route = createFileRoute("/_app/import")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Import Excel — CV MR Express" }, { name: "description", content: "Impor transaksi dari file Excel." }, { property: "og:title", content: "Import Excel — CV MR Express" }, { property: "og:description", content: "Impor transaksi dari file Excel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const HEAD = ["Tanggal", "Rekening", "Jenis", "Keterangan", "Kategori", "Nominal"];

async function downloadTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Transaksi");
  ws.addRow(HEAD).font = { bold: true };
  ws.addRow(["01/10/2026", "BCA", "Pemasukan", "Contoh pembayaran ongkir", "Ongkir", 1500000]);
  ws.columns.forEach((c) => { c.width = 20; });
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf])); a.download = "template-import.xlsx"; a.click();
}

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const accounts = useQuery(accountsQ());
  const hist = useQuery(importsQ());
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [bad, setBad] = useState<{ line: number; error: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const mine = (accounts.data ?? []).filter((a) => a.ledger === role);
  const accName = (id: string) => mine.find((a) => a.id === id)?.name;

  const onFile = async (fl: File | undefined) => {
    if (!fl) return;
    if (fl.size > 5 * 1024 * 1024) { toast.error("File maksimal 5 MB"); return; }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await fl.arrayBuffer());
      const ws = wb.worksheets[0]; if (!ws) throw new Error("Sheet tidak ditemukan");
      const ok: ImportRow[] = []; const errs: { line: number; error: string }[] = []; const seen = new Map<string, number>();
      ws.eachRow((r, n) => {
        if (n === 1) return;
        const cells = HEAD.map((_, i) => { const v = r.getCell(i + 1).value; return v && typeof v === "object" && "result" in v ? v.result : v; });
        if (cells.every((c) => c === null || c === undefined || String(c).trim() === "")) return;
        const base = parseImportRow(cells, mine, 0);
        if (base.error) { errs.push({ line: n, error: base.error }); return; }
        const k = base.row!.fingerprint; const idx = seen.get(k) ?? 0; seen.set(k, idx + 1);
        ok.push(parseImportRow(cells, mine, idx).row!);
      });
      setFile(fl.name); setRows(ok); setBad(errs);
    } catch (e) { toast.error("Gagal membaca file: " + errMsg(e)); }
  };
  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("import_transactions", { p_file_name: file, p_rows: rows as never, p_skipped_invalid: bad.length });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${data.rows_imported} transaksi diimpor, ${data.rows_skipped} dilewati (duplikat/tidak valid)`);
    setRows([]); setBad([]); setFile("");
    qc.invalidateQueries({ queryKey: ["transactions"] }); qc.invalidateQueries({ queryKey: ["balances"] }); qc.invalidateQueries({ queryKey: ["imports"] });
  };

  return (
    <>
      <PageHeader title="Import Excel"><Button size="sm" variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4" />Template</Button></PageHeader>
      <main className="min-w-0 space-y-4 p-3 sm:p-4">
        <Panel title="Unggah File (.xlsx)">
          <p className="mb-3 text-xs text-muted-foreground">Kolom: {HEAD.join(", ")}. Baris yang sama persis dengan data yang sudah pernah diimpor akan dilewati otomatis.</p>
          {accounts.error && <p role="alert" className="mb-2 text-sm text-destructive">Gagal memuat rekening: {errMsg(accounts.error)}</p>}
          <label aria-disabled={!mine.length} className="aria-disabled:pointer-events-none aria-disabled:opacity-50 inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"><Upload className="h-4 w-4" />Pilih file
            <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
          {file && <div className="mt-4 space-y-3">
           <p className="break-words text-sm"><b className="[overflow-wrap:anywhere]">{file}</b>: {rows.length} baris valid, {bad.length} tidak valid.</p>
             {bad.length > 0 && <ul className="max-h-32 overflow-auto break-words rounded bg-danger-soft p-2 text-xs text-destructive">{bad.map((b) => <li key={b.line}>Baris {b.line}: {b.error}</li>)}</ul>}
             {rows.length > 0 && <>
             <div className="max-h-72 overflow-y-auto divide-y md:hidden">
               {rows.slice(0, 100).map((r, i) => <article key={i} className="min-w-0 space-y-2 py-3">
                 <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-xs"><span className="min-w-0 break-words font-semibold">{accName(r.account_id)} · {txTypeLabel[r.tx_type]}</span><time className="shrink-0 text-muted-foreground">{fmtDate(r.tx_date)}</time></div>
                 <p className="break-words text-sm [overflow-wrap:anywhere]">{r.description}</p>
                 <dl className="grid min-w-0 grid-cols-2 gap-2 text-xs"><div className="min-w-0"><dt className="text-muted-foreground">Kategori</dt><dd className="break-words">{r.category ?? "-"}</dd></div><div className="min-w-0 text-right"><dt className="text-muted-foreground">Nominal</dt><dd className="break-words font-semibold tabular-nums">{rupiah(r.amount)}</dd></div></dl>
               </article>)}
             </div>
             <div className="hidden max-h-72 max-w-full overflow-auto md:block"><table className="w-full">
              <thead><tr>{HEAD.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 100).map((r, i) => <tr key={i}><td className={td}>{fmtDate(r.tx_date)}</td><td className={td}>{accName(r.account_id)}</td><td className={td}>{txTypeLabel[r.tx_type]}</td><td className={td}>{r.description}</td><td className={td}>{r.category ?? "-"}</td><td className={td}>{rupiah(r.amount)}</td></tr>)}</tbody>
             </table></div></>}
             <Button className="w-full sm:w-auto" onClick={submit} disabled={busy || !rows.length}>{busy ? "Mengimpor..." : `Impor ${rows.length} Transaksi`}</Button>
          </div>}
        </Panel>
        <Panel title="Riwayat Import">
          <QueryState isLoading={hist.isLoading} error={hist.error} empty={!hist.data?.length} emptyText="Belum ada import" onRetry={() => hist.refetch()}>
             <div className="divide-y md:hidden">{hist.data?.map((b) => <article key={b.id} className="min-w-0 space-y-2 py-3">
               <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{b.file_name}</p>
               <p className="text-xs text-muted-foreground">{fmtDateTime(b.created_at)}</p>
               <dl className="grid grid-cols-3 gap-2 text-xs">{[["Total", b.rows_total], ["Diimpor", b.rows_imported], ["Dilewati", b.rows_skipped]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-semibold tabular-nums">{value}</dd></div>)}</dl>
             </article>)}</div>
             <div className="hidden max-w-full overflow-x-auto md:block"><table className="w-full"><thead><tr>{["Waktu", "File", "Total", "Diimpor", "Dilewati"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
               <tbody>{hist.data?.map((b) => <tr key={b.id}><td className={td}>{fmtDateTime(b.created_at)}</td><td className={td}>{b.file_name}</td><td className={td}>{b.rows_total}</td><td className={td}>{b.rows_imported}</td><td className={td}>{b.rows_skipped}</td></tr>)}</tbody></table></div>
          </QueryState>
        </Panel>
      </main>
    </>
  );
}
