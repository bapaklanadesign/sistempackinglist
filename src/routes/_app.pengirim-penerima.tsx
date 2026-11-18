import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./_app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterPanel } from "@/components/packing/master-crud";
import { plMeta } from "@/components/packing/shared";

export const Route = createFileRoute("/_app/pengirim-penerima")({
  head: () => plMeta("Pengirim & Penerima", "Data kontak pengirim dan penerima barang."),
  component: () => (
    <>
      <PageHeader title="Pengirim & Penerima" subtitle="Kontak yang dipakai pada Packing List" />
      <main className="min-w-0 p-3 sm:p-6">
        <Tabs defaultValue="pengirim">
          <TabsList><TabsTrigger value="pengirim">Pengirim</TabsTrigger><TabsTrigger value="penerima">Penerima</TabsTrigger></TabsList>
          <TabsContent value="pengirim"><MasterPanel kind="pengirim" /></TabsContent>
          <TabsContent value="penerima"><MasterPanel kind="penerima" /></TabsContent>
        </Tabs>
      </main>
    </>
  ),
});
