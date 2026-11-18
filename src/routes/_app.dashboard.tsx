import { createFileRoute } from "@tanstack/react-router";
import { BookkeepingDashboard } from "@/components/dashboard/bookkeeping-dashboard";

// Super Admin only (enforced by the /_app access guard and RLS): Pembukuan + Packing List.
export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Dashboard Utama — CV MR Express" }, { name: "description", content: "Ringkasan pembukuan dan Packing List CV MR Express." }, { property: "og:title", content: "Dashboard Utama — CV MR Express" }, { property: "og:description", content: "Ringkasan pembukuan dan Packing List CV MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <BookkeepingDashboard combined />,
});
