import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil, Printer, RefreshCw, Trash2 } from "lucide-react";
import { td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { fmtNum } from "@/lib/packing-logic";
import type { PlRow } from "@/lib/packing-data";
import { PlStatusBadge } from "./shared";

const d = (s: string | null) => (s ? fmtDate(s) : "-");
const route = (p: PlRow) => `${p.origin?.name ?? "-"} → ${p.destination?.name ?? "-"}`;

/** Desktop table + mobile cards for a list of Packing Lists; `actions` renders the per-row buttons. */
export function PlTable({ rows, actions, schedule }: { rows: PlRow[]; actions: (p: PlRow) => ReactNode; schedule?: boolean }) {
  const heads = schedule
    ? ["No. PL", "Kapal / Voyage", "Rute", "ETD", "ETA", "Koli", "Status"]
    : ["No. PL", "Tanggal", "Pengirim", "Penerima", "Kapal", "Koli", "Berat (kg)", "Volume (m³)", "Status"];
  return (
    <>
      <div className="hidden overflow-x-auto lg:block"><table className="w-full">
        <thead><tr>{heads.map((h) => <th key={h} className={th}>{h}</th>)}<th className={`${th} sticky right-0 z-10`}>Aksi</th></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id}>
            <td className={td}><Link to="/packing-list/$id" params={{ id: p.id }} className="font-semibold text-primary hover:underline">{p.pl_number}</Link></td>
            {schedule ? (<>
              <td className={td}>{p.vessel?.name ?? "-"}{p.voyage_no ? ` · V.${p.voyage_no}` : ""}</td>
              <td className={td}>{route(p)}</td><td className={td}>{d(p.etd)}</td><td className={td}>{d(p.eta)}</td>
              <td className={`${td} text-right tabular-nums`}>{fmtNum(p.total_koli)}</td>
            </>) : (<>
              <td className={td}>{d(p.pl_date)}</td>
              <td className={`${td} max-w-40 truncate`} title={p.shipper?.name}>{p.shipper?.name ?? "-"}</td>
              <td className={`${td} max-w-40 truncate`} title={p.consignee?.name}>{p.consignee?.name ?? "-"}</td>
              <td className={td}>{p.vessel?.name ?? "-"}</td>
              <td className={`${td} text-right tabular-nums`}>{fmtNum(p.total_koli)}</td>
              <td className={`${td} text-right tabular-nums`}>{fmtNum(p.total_weight_kg)}</td>
              <td className={`${td} text-right tabular-nums`}>{fmtNum(p.total_volume_m3, 4)}</td>
            </>)}
            <td className={td}><PlStatusBadge s={p.status} /></td>
            <td className={`${td} sticky right-0 bg-card`}>{actions(p)}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <div className="divide-y lg:hidden">{rows.map((p) => (
        <article key={p.id} className="min-w-0 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <Link to="/packing-list/$id" params={{ id: p.id }} className="min-w-0 break-words font-bold text-primary">{p.pl_number}</Link>
            <PlStatusBadge s={p.status} />
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">{p.shipper?.name ?? "-"} → {p.consignee?.name ?? "-"}</p>
          <p className="break-words text-xs text-muted-foreground">{p.vessel?.name ?? "Kapal belum ditentukan"}{p.voyage_no ? ` · V.${p.voyage_no}` : ""} · {route(p)}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-muted-foreground">{schedule ? "ETD" : "Tanggal"}</dt><dd className="font-semibold">{d(schedule ? p.etd : p.pl_date)}</dd></div>
            <div><dt className="text-muted-foreground">{schedule ? "ETA" : "Koli"}</dt><dd className="font-semibold">{schedule ? d(p.eta) : fmtNum(p.total_koli)}</dd></div>
            <div><dt className="text-muted-foreground">{schedule ? "Koli" : "Berat"}</dt><dd className="font-semibold">{schedule ? fmtNum(p.total_koli) : `${fmtNum(p.total_weight_kg)} kg`}</dd></div>
          </dl>
          <div className="mt-2">{actions(p)}</div>
        </article>
      ))}</div>
    </>
  );
}

export function filterPl(rows: PlRow[], search: string, status: string) {
  const s = search.trim().toLowerCase();
  return rows.filter((p) => (status === "all" || p.status === status) && (!s || [p.pl_number, p.shipper?.name, p.consignee?.name, p.vessel?.name, p.voyage_no, p.container_no, p.destination?.name]
    .some((x) => (x ?? "").toLowerCase().includes(s))));
}

export function PlRowActions({ p, onStatus, onDelete, print, printing }: { p: PlRow; onStatus: (p: PlRow) => void; onDelete?: ((p: PlRow) => void) | undefined; print: (id: string) => void; printing: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button asChild size="sm" variant="ghost" aria-label={`Lihat ${p.pl_number}`}><Link to="/packing-list/$id" params={{ id: p.id }}><Eye className="h-4 w-4" /></Link></Button>
      <Button asChild size="sm" variant="ghost" aria-label={`Edit ${p.pl_number}`}><Link to="/packing-list/$id/edit" params={{ id: p.id }}><Pencil className="h-4 w-4" /></Link></Button>
      <Button size="sm" variant="ghost" aria-label={`Ubah status ${p.pl_number}`} onClick={() => onStatus(p)}><RefreshCw className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" aria-label={`Cetak PDF ${p.pl_number}`} disabled={printing} onClick={() => print(p.id)}><Printer className="h-4 w-4" /></Button>
      {onDelete && <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Hapus ${p.pl_number}`} onClick={() => onDelete(p)}><Trash2 className="h-4 w-4" /></Button>}
    </div>
  );
}

