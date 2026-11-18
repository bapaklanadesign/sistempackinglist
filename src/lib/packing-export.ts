import { fmtDate } from "./format";
import { plStatusLabel } from "./packing-logic";
import type { PlRow } from "./packing-data";

/** Excel report of Packing Lists in a period, from rows already read from the database. */
export async function exportPlExcel(rows: PlRow[], title: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Packing List");
  ws.addRow([title]).font = { bold: true, size: 13 };
  ws.addRow([]);
  ws.addRow(["No. PL", "Tanggal", "Pengirim", "Penerima", "Kapal", "Voyage", "Asal", "Tujuan", "ETD", "ETA", "Kontainer", "Segel", "Barang", "Koli", "Berat (kg)", "Volume (m3)", "Nilai (Rp)", "Status"]).font = { bold: true };
  rows.forEach((p) => ws.addRow([p.pl_number, fmtDate(p.pl_date), p.shipper?.name ?? "", p.consignee?.name ?? "", p.vessel?.name ?? "", p.voyage_no ?? "", p.origin?.name ?? "", p.destination?.name ?? "",
    p.etd ? fmtDate(p.etd) : "", p.eta ? fmtDate(p.eta) : "", p.container_no ?? "", p.seal_no ?? "", p.item_count, Number(p.total_koli), Number(p.total_weight_kg), Number(p.total_volume_m3), Number(p.total_value), plStatusLabel[p.status]]));
  ws.columns.forEach((c, i) => { c.width = [18, 12, 22, 22, 18, 10, 16, 16, 12, 12, 14, 12, 8, 8, 12, 12, 14, 12][i] ?? 12; });
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
