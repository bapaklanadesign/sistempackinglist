// Builds Packing List and ship manifest PDFs from rows freshly read from the database.
import { fmtDate } from "./format";
import { conditionLabel, fmtNum, plStatusLabel, unitLabel } from "./packing-logic";
import type { PlDetail, PlRow } from "./packing-data";

const d = (s: string | null | undefined) => (s ? fmtDate(s) : "-");
const v = (s: string | null | undefined) => (s && s.trim() ? s : "-");
const port = (p: PlRow["origin"]) => (p ? `${p.name}${p.city ? ` (${p.city})` : ""}` : "-");
const party = (p: PlRow["shipper"]) => (p ? [p.name, p.company, p.address, p.city, p.phone ? `Telp. ${p.phone}` : null].filter(Boolean).join("\n") : "-");
const rp = (n: number | null) => (n == null ? "-" : `Rp ${fmtNum(n, 2)}`);

async function lib() {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  return { jsPDF, autoTable };
}

function brand(doc: import("jspdf").jsPDF, title: string, sub: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("CV MR EXPRESS", 14, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Agen Pengiriman Barang via Kapal PELNI · Surabaya", 14, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(title, w - 14, 15, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(sub, w - 14, 20, { align: "right" });
  doc.setLineWidth(0.4); doc.line(14, 23, w - 14, 23);
}

export async function printPackingList(pl: PlDetail) {
  const { jsPDF, autoTable } = await lib();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  brand(doc, "PACKING LIST", pl.pl_number);
  autoTable(doc, {
    startY: 27, theme: "plain", styles: { fontSize: 8.5, cellPadding: 1.2 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 }, 2: { fontStyle: "bold", cellWidth: 30 } },
    body: [
      ["Tanggal", d(pl.pl_date), "Status", plStatusLabel[pl.status]],
      ["Kapal", v(pl.vessel?.name), "No. Voyage", v(pl.voyage_no)],
      ["Pelabuhan Asal", port(pl.origin), "Pelabuhan Tujuan", port(pl.destination)],
      ["ETD", d(pl.etd), "ETA", d(pl.eta)],
      ["No. Kontainer", v(pl.container_no), "No. Segel", v(pl.seal_no)],
    ],
  });
  const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  autoTable(doc, {
    startY: y1, theme: "grid", styles: { fontSize: 8.5, cellPadding: 2, valign: "top" }, headStyles: { fillColor: [20, 40, 90] },
    head: [["PENGIRIM", "PENERIMA"]], body: [[party(pl.shipper), party(pl.consignee)]],
  });
  const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: y2, theme: "grid", styles: { fontSize: 7.5, cellPadding: 1.5 }, headStyles: { fillColor: [20, 40, 90], halign: "center" },
    head: [["No", "Nama Barang", "Jumlah", "Berat/Sat (kg)", "Total Berat (kg)", "Ukuran P×L×T (cm)", "Volume (m³)", "Nilai", "Kondisi", "Keterangan"]],
    body: pl.items.map((i) => [
      i.line_no, i.name, `${fmtNum(i.qty)} ${unitLabel[i.unit] ?? i.unit}`, fmtNum(i.weight_kg), fmtNum(Number(i.qty) * Number(i.weight_kg)),
      i.length_cm && i.width_cm && i.height_cm ? `${fmtNum(i.length_cm)}×${fmtNum(i.width_cm)}×${fmtNum(i.height_cm)}` : "-",
      fmtNum(i.volume_m3, 4), rp(i.value_idr == null ? null : Number(i.value_idr)), conditionLabel[i.condition] ?? i.condition, v(i.notes),
    ]),
    foot: [["", "TOTAL", `${fmtNum(pl.total_koli)}`, "", fmtNum(pl.total_weight_kg), "", fmtNum(pl.total_volume_m3, 4), rp(Number(pl.total_value)), "", `${pl.item_count} baris`]],
    footStyles: { fillColor: [230, 235, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 0: { halign: "center", cellWidth: 8 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  if (pl.notes) { doc.setFontSize(8.5); doc.text(doc.splitTextToSize(`Catatan: ${pl.notes}`, w - 28), 14, y); y += 10; }
  if (y > 250) { doc.addPage(); y = 20; }
  const cols = ["Pengirim", "Petugas CV MR Express", "Penerima"];
  doc.setFontSize(9);
  cols.forEach((c, i) => {
    const x = 14 + i * ((w - 28) / 3) + (w - 28) / 6;
    doc.text(c, x, y + 4, { align: "center" });
    doc.line(x - 22, y + 26, x + 22, y + 26);
  });
  doc.setFontSize(7); doc.text(`Dicetak ${new Date().toLocaleString("id-ID")} dari data sistem CV MR Express`, 14, doc.internal.pageSize.getHeight() - 8);
  doc.save(`${pl.pl_number}.pdf`);
}

export async function printManifest(info: { vessel: string; voyage: string | null; etd: string | null }, pls: PlRow[]) {
  const { jsPDF, autoTable } = await lib();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  brand(doc, "MANIFEST KAPAL", `${info.vessel} · Voyage ${v(info.voyage)}`);
  const totals = pls.reduce((a, p) => ({ koli: a.koli + Number(p.total_koli), w: a.w + Number(p.total_weight_kg), vol: a.vol + Number(p.total_volume_m3), items: a.items + p.item_count }), { koli: 0, w: 0, vol: 0, items: 0 });
  doc.setFontSize(9);
  doc.text(`Kapal: ${info.vessel}    Voyage: ${v(info.voyage)}    ETD: ${d(info.etd)}    Jumlah Packing List: ${pls.length}`, 14, 29);
  autoTable(doc, {
    startY: 33, theme: "grid", styles: { fontSize: 7.5, cellPadding: 1.5 }, headStyles: { fillColor: [20, 40, 90], halign: "center" },
    head: [["No", "No. Packing List", "Tanggal", "Pengirim", "Penerima", "Asal → Tujuan", "Kontainer / Segel", "Barang", "Koli", "Berat (kg)", "Volume (m³)", "Status"]],
    body: pls.map((p, i) => [i + 1, p.pl_number, d(p.pl_date), v(p.shipper?.name), v(p.consignee?.name), `${p.origin?.name ?? "-"} → ${p.destination?.name ?? "-"}`,
      `${v(p.container_no)} / ${v(p.seal_no)}`, p.item_count, fmtNum(p.total_koli), fmtNum(p.total_weight_kg), fmtNum(p.total_volume_m3, 4), plStatusLabel[p.status]]),
    foot: [["", "TOTAL", "", "", "", "", "", totals.items, fmtNum(totals.koli), fmtNum(totals.w), fmtNum(totals.vol, 4), ""]],
    footStyles: { fillColor: [230, 235, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 0: { halign: "center", cellWidth: 8 }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" } },
  });
  doc.setFontSize(7); doc.text(`Dicetak ${new Date().toLocaleString("id-ID")} dari data sistem CV MR Express`, 14, doc.internal.pageSize.getHeight() - 8);
  doc.save(`manifest-${info.vessel}-${info.voyage ?? "tanpa-voyage"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf");
}
