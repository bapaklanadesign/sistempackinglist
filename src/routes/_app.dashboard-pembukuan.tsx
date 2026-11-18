import { createFileRoute } from "@tanstack/react-router";
import { BookkeepingDashboard } from "@/components/dashboard/bookkeeping-dashboard";

// Super Admin and Admin Laporan 1/2; each admin sees only their own ledger (RLS).
export const Route = createFileRoute("/_app/dashboard-pembukuan")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Dashboard Pembukuan — CV MR Express" }, { name: "description", content: "Saldo, transaksi dan laporan pembukuan CV MR Express." }, { property: "og:title", content: "Dashboard Pembukuan — CV MR Express" }, { property: "og:description", content: "Saldo, transaksi dan laporan pembukuan CV MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <BookkeepingDashboard />,
});
