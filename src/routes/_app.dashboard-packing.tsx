import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "./_app";
import { DashHero } from "@/components/dashboard/bookkeeping-dashboard";
import { PackingDashboard } from "@/components/packing/dashboard-summary";
import { roleLabel, useAuth } from "@/lib/auth";
import ship from "@/assets/kapal-foto.jpg";

// Super Admin and Admin Packing List only (access guard + is_staff() RLS on pl_* tables).
export const Route = createFileRoute("/_app/dashboard-packing")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Dashboard Packing List — CV MR Express" }, { name: "description", content: "Ringkasan dokumen, barang dan pengiriman Packing List CV MR Express." }, { property: "og:title", content: "Dashboard Packing List — CV MR Express" }, { property: "og:description", content: "Ringkasan dokumen, barang dan pengiriman Packing List CV MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { role } = useAuth();
  return (
    <>
      <PageHeader title="Dashboard Packing List" subtitle={`${role ? roleLabel[role] : ""} · Packing List & Pengiriman`} />
      <main className="dash-canvas min-w-0 space-y-5 p-3 sm:p-6">
        <DashHero eyebrow="PACKING LIST MR EXPRESS" image={ship} alt="Kapal barang PELNI di pelabuhan" title="Dashboard Packing List" subtitle="Pantau dokumen, barang, kapal, jadwal keberangkatan dan manifest pengiriman" />
        <PackingDashboard />
      </main>
    </>
  );
}
