import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileStack, Printer } from "lucide-react";
import { PageHeader } from "./_app";
import { Pager, Panel, QueryState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { SearchBox, plMeta, usePrintPl } from "@/components/packing/shared";
import { PlTable, filterPl } from "@/components/packing/pl-table";
import { plListQ } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/cetak-pdf")({
  head: () => plMeta("Cetak PDF", "Cetak dokumen Packing List dan manifest kapal ke PDF."),
  component: Page,
});

function Page() {
  const q = useQuery(plListQ());
  const { print, busyId } = usePrintPl();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rows = filterPl(q.data ?? [], search, "all");
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  return (
    <>
      <PageHeader title="Cetak PDF" subtitle="PDF selalu dibuat dari data terbaru di database">
        <Button asChild size="sm" variant="outline"><Link to="/manifest"><FileStack className="h-4 w-4" />Cetak Manifest Kapal</Link></Button>
      </PageHeader>
      <main className="min-w-0 p-3 sm:p-6">
        <Panel title="Pilih Packing List" action={<SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari no. PL, pengirim, kapal..." />}>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText="Belum ada Packing List untuk dicetak" onRetry={() => q.refetch()}>
            <PlTable rows={rows.slice((page - 1) * 25, page * 25)} actions={(p) => <Button size="sm" onClick={() => print(p.id)} disabled={busyId === p.id}><Printer className="h-4 w-4" />{busyId === p.id ? "Menyiapkan..." : "Cetak PDF"}</Button>} />
            <Pager page={page} pages={pages} onPage={setPage} />
          </QueryState>
        </Panel>
      </main>
    </>
  );
}
