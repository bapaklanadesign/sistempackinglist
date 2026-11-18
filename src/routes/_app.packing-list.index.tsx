import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "./_app";
import { Pager, Panel, QueryState } from "@/components/ui-kit";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBox, StatusDialog, plMeta, usePlRefresh, usePrintPl } from "@/components/packing/shared";
import { PlRowActions, PlTable, filterPl } from "@/components/packing/pl-table";
import { useAuth } from "@/lib/auth";
import { PL_STATUSES, canDeletePl, plStatusLabel } from "@/lib/packing-logic";
import { deletePlRow, plError, plListQ, type PlRow } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/packing-list/")({
  head: () => plMeta("Data Packing List", "Daftar dokumen Packing List CV MR Express."),
  component: Page,
});

function Page() {
  const { role } = useAuth();
  const q = useQuery(plListQ());
  const refresh = usePlRefresh();
  const { print, busyId } = usePrintPl();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [statusPl, setStatusPl] = useState<PlRow | null>(null);
  const [del, setDel] = useState<PlRow | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const rows = filterPl(q.data ?? [], search, status);
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const remove = async () => {
    if (!del) return;
    setDelBusy(true);
    try { await deletePlRow("pl_packing_lists", del.id); toast.success(`${del.pl_number} dihapus`); await refresh(); setDel(null); }
    catch (e) { toast.error(plError(e)); }
    finally { setDelBusy(false); }
  };
  return (
    <>
      <PageHeader title="Data Packing List" subtitle="Dokumen Packing List bersama Super Admin dan Admin Packing List">
        <Button asChild size="sm"><Link to="/packing-list/baru"><Plus className="h-4 w-4" />Packing List Baru</Link></Button>
      </PageHeader>
      <main className="min-w-0 p-3 sm:p-6">
        <Panel title={`Semua Packing List (${rows.length})`} action={<div className="flex flex-wrap gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari no. PL, pengirim, kapal..." />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger aria-label="Filter status" className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Status</SelectItem>{PL_STATUSES.map((s) => <SelectItem key={s} value={s}>{plStatusLabel[s]}</SelectItem>)}</SelectContent></Select>
        </div>}>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText={q.data?.length ? "Tidak ada Packing List yang cocok dengan filter" : "Belum ada Packing List. Klik \"Packing List Baru\" untuk membuat."} onRetry={() => q.refetch()}>
            <PlTable rows={rows.slice((page - 1) * 25, page * 25)} actions={(p) => <PlRowActions p={p} onStatus={setStatusPl} onDelete={canDeletePl(role) ? setDel : undefined} print={print} printing={busyId === p.id} />} />
            <Pager page={page} pages={pages} onPage={setPage} />
          </QueryState>
        </Panel>
      </main>
      <StatusDialog pl={statusPl} onClose={() => setStatusPl(null)} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${del?.pl_number ?? ""}?`}
        description="Packing List beserta seluruh barang dan riwayat statusnya akan dihapus permanen. Penghapusan tercatat di riwayat aktivitas." confirmLabel="Ya, hapus" destructive busy={delBusy} onConfirm={remove} />
    </>
  );
}
