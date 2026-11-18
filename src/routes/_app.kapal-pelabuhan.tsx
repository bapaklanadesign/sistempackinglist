import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./_app";
import { MasterPanel } from "@/components/packing/master-crud";
import { plMeta } from "@/components/packing/shared";

export const Route = createFileRoute("/_app/kapal-pelabuhan")({
  head: () => plMeta("Kapal & Pelabuhan", "Data kapal dan pelabuhan untuk Packing List."),
  component: () => (
    <>
      <PageHeader title="Kapal & Pelabuhan" subtitle="Data kapal dan pelabuhan yang dipakai pada pengiriman" />
      <main className="grid min-w-0 gap-4 p-3 sm:p-6 xl:grid-cols-2"><MasterPanel kind="kapal" /><MasterPanel kind="pelabuhan" /></main>
    </>
  ),
});
