import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BookkeepingDashboard } from "@/components/dashboard/bookkeeping-dashboard";

// Admin Laporan 1/2 see only their own ledger (RLS); Super Admin uses the single Dashboard Utama.
export const Route = createFileRoute("/_app/dashboard-pembukuan")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Dashboard Pembukuan — CV MR Express" }, { name: "description", content: "Saldo, transaksi dan laporan pembukuan CV MR Express." }, { property: "og:title", content: "Dashboard Pembukuan — CV MR Express" }, { property: "og:description", content: "Saldo, transaksi dan laporan pembukuan CV MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { role } = useAuth();
  if (role === "super_admin") return <Navigate to="/dashboard" replace />;
  return <BookkeepingDashboard />;
}
