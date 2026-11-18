import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "./_app";
import { QueryState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { PlForm } from "@/components/packing/pl-form";
import { plMeta } from "@/components/packing/shared";
import { itemToInput, plDetailQ, plToHeader } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/packing-list/$id/edit")({
  head: () => plMeta("Edit Packing List", "Ubah data dan barang Packing List."),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const q = useQuery(plDetailQ(id));
  return (
    <>
      <PageHeader title={q.data ? `Edit ${q.data.pl_number}` : "Edit Packing List"} subtitle="Perubahan tercatat di riwayat aktivitas" />
      <QueryState isLoading={q.isLoading} error={q.error} empty={!q.data} emptyText="Packing List tidak ditemukan atau sudah dihapus" onRetry={() => q.refetch()}>
        {q.data && <PlForm key={q.data.updated_at} id={id} plNumber={q.data.pl_number} initialHeader={plToHeader(q.data)} initialItems={q.data.items.map(itemToInput)} />}
      </QueryState>
      {!q.isLoading && !q.data && !q.error && <div className="text-center"><Button asChild variant="outline"><Link to="/packing-list">Kembali ke daftar</Link></Button></div>}
    </>
  );
}
