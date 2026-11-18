import { fmtDate, txTypeLabel } from "./format";
import type { Balance, Tx } from "./data";

type Row = Tx & { bank_accounts: { name: string } | null };
const ledgerName = (l: string) => (l === "admin1" ? "Admin Laporan 1" : "Admin Laporan 2");

const ACCOUNT_ORDER = ["BCA", "BRI", "Mandiri", "BNI", "MDU"];
const FILL = {
  band: { type: "pattern", pattern: "solid", fgColor: { argb: "FFED7D31" } },
  debet: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8CBAD" } },
  kredit: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } },
  blue: { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B0F0" } },
  head: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } },
} as const;
const BORDER = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as const;
const RP = '"Rp" #,##0';

/**
 * Laporan gabungan ala buku kas: blok saldo per admin di atas, lalu tabel
 * matriks No/Tanggal/Admin/Keterangan + kolom DEBET/KREDIT per rekening,
 * ditutup baris JUMLAH dan TOTAL (debet - kredit) per rekening.
 */
export async function exportLaporanMatrix(rows: Row[], title: string, balances: Balance[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan");

  const names = new Set([...balances.map((b) => b.name), ...rows.map((t) => t.bank_accounts?.name ?? "")]);
  const accounts = [...ACCOUNT_ORDER.filter((a) => names.has(a)), ...[...names].filter((n): n is string => !!n && !ACCOUNT_ORDER.includes(n)).sort()];
  const nCols = 4 + accounts.length * 2;
  const colLetter = (i: number) => {
    let s = ""; let n = i;
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  const last = colLetter(nCols);

  // Judul
  ws.mergeCells(`A1:${last}1`);
  const t = ws.getCell("A1");
  t.value = title.toUpperCase();
  t.font = { bold: true, size: 14 };
  t.alignment = { horizontal: "center" };

  // Blok saldo per admin (kiri: Admin 1, kanan: Admin 2)
  const block = (startCol: number, ledger: string, label: string) => {
    ws.mergeCells(3, startCol, 3, startCol + 1);
    const h = ws.getCell(3, startCol);
    h.value = `SALDO ${label}`;
    h.font = { bold: true };
    h.fill = FILL.head;
    h.alignment = { horizontal: "center" };
    h.border = BORDER;
    ws.getCell(3, startCol + 1).border = BORDER;
    let total = 0;
    accounts.forEach((a, i) => {
      const bal = balances.find((b) => b.ledger === ledger && b.name === a);
      const v = Number(bal?.balance ?? 0);
      total += v;
      const r = 4 + i;
      const cName = ws.getCell(r, startCol);
      const cVal = ws.getCell(r, startCol + 1);
      cName.value = a;
      cName.font = { bold: true, color: { argb: "FFC00000" } };
      cVal.value = v;
      cVal.numFmt = RP;
      cName.border = BORDER; cVal.border = BORDER;
    });
    const jr = 4 + accounts.length;
    const jn = ws.getCell(jr, startCol);
    const jv = ws.getCell(jr, startCol + 1);
    jn.value = "JUMLAH";
    jn.font = { bold: true };
    jn.fill = FILL.blue;
    jv.value = total;
    jv.numFmt = RP;
    jv.font = { bold: true, color: { argb: "FFFFFF00" } };
    jv.fill = FILL.blue;
    jn.border = BORDER; jv.border = BORDER;
    jn.alignment = { horizontal: "center" };
  };
  block(1, "admin1", "ADMIN 1");
  block(4, "admin2", "ADMIN 2");

  // Kepala tabel matriks
  const top = 4 + accounts.length + 2; // satu baris kosong setelah blok saldo
  ws.mergeCells(top, 1, top, nCols);
  const band = ws.getCell(top, 1);
  band.value = "PEMASUKAN DAN PENGELUARAN KEUANGAN";
  band.font = { bold: true, size: 12 };
  band.fill = FILL.band;
  band.alignment = { horizontal: "center" };
  for (let c = 1; c <= nCols; c++) ws.getCell(top, c).border = BORDER;

  const h1 = top + 1;
  const h2 = top + 2;
  const fixed = ["No.", "TANGGAL", "ADMIN", "KETERANGAN"];
  fixed.forEach((label, i) => {
    ws.mergeCells(h1, i + 1, h2, i + 1);
    const c = ws.getCell(h1, i + 1);
    c.value = label;
    c.font = { bold: true };
    c.fill = FILL.head;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = BORDER;
    ws.getCell(h2, i + 1).border = BORDER;
  });
  accounts.forEach((a, i) => {
    const c1 = 5 + i * 2;
    ws.mergeCells(h1, c1, h1, c1 + 1);
    const name = ws.getCell(h1, c1);
    name.value = a.toUpperCase();
    name.font = { bold: true };
    name.fill = FILL.band;
    name.alignment = { horizontal: "center" };
    name.border = BORDER;
    ws.getCell(h1, c1 + 1).border = BORDER;
    const d = ws.getCell(h2, c1);
    const k = ws.getCell(h2, c1 + 1);
    d.value = "DEBET"; d.fill = FILL.debet; d.font = { bold: true };
    k.value = "KREDIT"; k.fill = FILL.kredit; k.font = { bold: true };
    d.alignment = { horizontal: "center" }; k.alignment = { horizontal: "center" };
    d.border = BORDER; k.border = BORDER;
  });

  // Baris data: pemasukan/transfer masuk -> DEBET, pengeluaran/transfer keluar -> KREDIT
  const sorted = [...rows].sort((a, b) => a.tx_date.localeCompare(b.tx_date) || a.created_at.localeCompare(b.created_at));
  const firstData = h2 + 1;
  sorted.forEach((tx, i) => {
    const r = firstData + i;
    const acc = tx.bank_accounts?.name ?? "";
    const isDebet = tx.tx_type === "income" || tx.tx_type === "transfer_in";
    const vals: (string | number)[] = [i + 1, fmtDate(tx.tx_date), ledgerName(tx.ledger), tx.description];
    accounts.forEach((a) => {
      const hit = a === acc ? Number(tx.amount) : "";
      vals.push(isDebet ? hit : "", isDebet ? "" : hit);
    });
    const row = ws.getRow(r);
    row.values = vals;
    for (let c = 1; c <= nCols; c++) {
      const cell = row.getCell(c);
      cell.border = BORDER;
      if (c >= 5) cell.numFmt = RP;
    }
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "center" };
  });

  // JUMLAH per kolom + TOTAL (debet - kredit) per rekening
  const sumRow = firstData + sorted.length;
  const totRow = sumRow + 1;
  ws.mergeCells(sumRow, 1, sumRow, 4);
  const sj = ws.getCell(sumRow, 1);
  sj.value = "JUMLAH";
  sj.font = { bold: true };
  sj.alignment = { horizontal: "center" };
  ws.mergeCells(totRow, 1, totRow, 4);
  const st = ws.getCell(totRow, 1);
  st.value = "TOTAL (DEBET - KREDIT)";
  st.font = { bold: true, color: { argb: "FFFFFF00" } };
  st.fill = FILL.blue;
  st.alignment = { horizontal: "center" };
  accounts.forEach((_, i) => {
    const c1 = 5 + i * 2;
    const L1 = colLetter(c1);
    const L2 = colLetter(c1 + 1);
    const range = (L: string) => `${L}${firstData}:${L}${sumRow - 1}`;
    const sd = ws.getCell(sumRow, c1);
    const sk = ws.getCell(sumRow, c1 + 1);
    sd.value = { formula: `SUM(${range(L1)})` };
    sk.value = { formula: `SUM(${range(L2)})` };
    sd.numFmt = RP; sk.numFmt = RP;
    sd.font = { bold: true }; sk.font = { bold: true };
    const td = ws.getCell(totRow, c1);
    const tk = ws.getCell(totRow, c1 + 1);
    ws.mergeCells(totRow, c1, totRow, c1 + 1);
    td.value = { formula: `${L1}${sumRow}-${L2}${sumRow}` };
    td.numFmt = RP;
    td.font = { bold: true, color: { argb: "FFFFFF00" } };
    td.fill = FILL.blue;
    tk.fill = FILL.blue;
  });
  for (let c = 1; c <= nCols; c++) {
    ws.getCell(sumRow, c).border = BORDER;
    ws.getCell(totRow, c).border = BORDER;
  }

  // Lebar kolom
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 17;
  ws.getColumn(3).width = 9;
  ws.getColumn(4).width = 34;
  accounts.forEach((_, i) => {
    ws.getColumn(5 + i * 2).width = 14;
    ws.getColumn(6 + i * 2).width = 14;
  });

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(title)}.xlsx`);
}

export async function exportExcel(rows: Row[], title: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Transaksi");
  ws.addRow([title]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const head = ws.addRow(["Tanggal", "Pembukuan", "Rekening", "Jenis", "Keterangan", "Kategori", "Nominal"]);
  head.font = { bold: true };
  rows.forEach((t) => ws.addRow([fmtDate(t.tx_date), ledgerName(t.ledger), t.bank_accounts?.name ?? "", txTypeLabel[t.tx_type], t.description, t.category ?? "", Number(t.amount)]));
  ws.getColumn(7).numFmt = "#,##0.00";
  ws.columns.forEach((c, i) => { c.width = [12, 12, 12, 16, 40, 16, 18][i] ?? 12; });
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(title)}.xlsx`);
}

export async function exportPdf(rows: Row[], title: string, summary: [string, string][]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14); doc.text(title, 14, 15);
  doc.setFontSize(9);
  summary.forEach(([k, v], i) => doc.text(`${k}: ${v}`, 14, 22 + i * 5));
  autoTable(doc, {
    startY: 24 + summary.length * 5,
    head: [["Tanggal", "Pembukuan", "Rekening", "Jenis", "Keterangan", "Nominal"]],
    body: rows.map((t) => [fmtDate(t.tx_date), ledgerName(t.ledger), t.bank_accounts?.name ?? "", txTypeLabel[t.tx_type] ?? "", t.description, Number(t.amount).toLocaleString("id-ID")]),
    styles: { fontSize: 8 },
  });
  doc.save(`${slug(title)}.pdf`);
}

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
