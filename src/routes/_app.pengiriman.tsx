import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, RefreshCw } from "lucide-react";
import { PageHeader } from "./_app";
import { Pager, Panel, QueryState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { SearchBox, StatusDialog, plMeta } from "@/components/packing/shared";
import { ScheduleDialog } from "@/components/packing/schedule-dialog";
import { PlTable, filterPl } from "@/components/packing/pl-table";
import { cn } from "@/lib/utils";
import { PL_STATUSES, plStatusLabel, plSummary, type PlStatus } from "@/lib/packing-logic";
import { plListQ, type PlRow } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/pengiriman")({
  validateSearch: (s: Record<string, unknown>): { status?: PlStatus } => (PL_STATUSES.includes(s["status"] as PlStatus) ? { status: s["status"] as PlStatus } : {}),
  head: () => plMeta("Pengiriman", "Jadwal dan status pengiriman Packing List."),
  component: Page,
});

function Page() {
  const { status } = Route.useSearch();
  const nav = useNavigate({ from: "/pengiriman" });
  const q = useQuery(plListQ());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusPl, setStatusPl] = useState<PlRow | null>(null);
  const [schedPl, setSchedPl] = useState<PlRow | null>(null);
  const all = q.data ?? [];
  const counts = plSummary(all).byStatus;
  const rows = filterPl(all, search, status ?? "all").slice().sort((a, b) => (a.etd ?? "9999").localeCompare(b.etd ?? "9999"));
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const chip = (s: PlStatus | undefined, label: string, n: number) => (
    <button key={label} onClick={() => { nav({ search: s ? { status: s } : {} }); setPage(1); }}
      className={cn("rounded-full border px-3 py-1 text-xs font-semibold", status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{label} <span className="opacity-75">{n}</span></button>
  );
  return (
    <>
      <PageHeader title="Pengiriman" subtitle="Atur jadwal kapal dan status setiap pengiriman" />
      <main className="min-w-0 space-y-4 p-3 sm:p-6">
        <div className="flex flex-wrap gap-2">{chip(undefined, "Semua", all.length)}{PL_STATUSES.map((s) => chip(s, plStatusLabel[s], counts[s]))}</div>
        <Panel title={`Jadwal Pengiriman (${rows.length})`} action={<SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari no. PL, kapal, tujuan..." />}>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Tidak ada pengiriman untuk filter ini" onRetry={() => q.refetch()}>
            <PlTable schedule rows={rows.slice((page - 1) * 25, page * 25)} actions={(p) => (
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setSchedPl(p)}><CalendarClock className="h-4 w-4" />Jadwal</Button>
                <Button size="sm" variant="outline" onClick={() => setStatusPl(p)}><RefreshCw className="h-4 w-4" />Status</Button>
              </div>
            )} />
            <Pager page={page} pages={pages} onPage={setPage} />
          </QueryState>
        </Panel>
      </main>
      <StatusDialog pl={statusPl} onClose={() => setStatusPl(null)} />
      <ScheduleDialog pl={schedPl} onClose={() => setSchedPl(null)} />
    </>
  );
}
