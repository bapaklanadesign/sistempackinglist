import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pager, QueryState, td, th } from "@/components/ui-kit";
import { fmtDateTime } from "@/lib/format";
import { plActionLabel, plEntityLabel, plStatusLabel, type PlStatus } from "@/lib/packing-logic";
import { PL_ACTIVITY_PAGE, plActivityQ, type PlActivity } from "@/lib/packing-data";

/** Human-readable detail for one activity row (status change, totals or name). */
export function activityDetail(a: PlActivity): string {
  const det = (a.details ?? {}) as { before?: Record<string, unknown>; after?: Record<string, unknown>; note?: string | null };
  if (a.action === "status") {
    const from = det.before?.["status"] as PlStatus | undefined; const to = det.after?.["status"] as PlStatus | undefined;
    return `${from ? plStatusLabel[from] : "-"} → ${to ? plStatusLabel[to] : "-"}${det.note ? ` · ${det.note}` : ""}`;
  }
  if (a.entity === "packing_list" && a.action !== "delete") {
    const r = det.after ?? {};
    return `${r["item_count"] ?? 0} barang · ${r["total_koli"] ?? 0} koli · ${r["total_weight_kg"] ?? 0} kg`;
  }
  return "";
}

export function PlActivityList({ packingListId, compact }: { packingListId?: string; compact?: boolean }) {
  const [page, setPage] = useState(1);
  const q = useQuery(plActivityQ(page - 1, packingListId));
  const rows = q.data?.rows ?? [];
  const pages = Math.max(1, Math.ceil((q.data?.count ?? 0) / PL_ACTIVITY_PAGE));
  return (
    <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Belum ada aktivitas tercatat" onRetry={() => q.refetch()}>
      {!compact && <div className="hidden overflow-x-auto lg:block"><table className="w-full">
        <thead><tr>{["Waktu", "Pengguna", "Aktivitas", "Data", "Rincian"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((a) => <tr key={a.id}>
          <td className={td}>{fmtDateTime(a.created_at)}</td><td className={td}>{a.actor_name ?? "-"}</td>
          <td className={td}>{plActionLabel[a.action] ?? a.action} · {plEntityLabel[a.entity] ?? a.entity}</td>
          <td className={`${td} font-semibold`}>{a.summary}</td><td className={`${td} max-w-72 truncate`} title={activityDetail(a)}>{activityDetail(a) || "-"}</td>
        </tr>)}</tbody>
      </table></div>}
      <ol className={`space-y-3 ${compact ? "" : "lg:hidden"}`}>{rows.map((a) => <li key={a.id} className="border-b pb-2 text-xs last:border-b-0">
        <p className="break-words text-sm font-semibold">{plActionLabel[a.action] ?? a.action} · {plEntityLabel[a.entity] ?? a.entity} <span className="font-normal">{a.summary}</span></p>
        <p className="text-muted-foreground">{fmtDateTime(a.created_at)} · {a.actor_name ?? "-"}</p>
        {activityDetail(a) && <p className="break-words">{activityDetail(a)}</p>}
      </li>)}</ol>
      <Pager page={page} pages={pages} onPage={setPage} />
    </QueryState>
  );
}
