import { createFileRoute } from "@tanstack/react-router";
import { PublicSite } from "@/components/public-site";
import { publicHead } from "@/lib/public-shipping";
export const Route = createFileRoute("/rute-pengiriman")({
  head: () => publicHead("Rute & Estimasi Pengiriman | CV MR EXPRESS", "Rute pengiriman dari Surabaya ke Ambon, Tual, Ternate, Kaimana, Sorong, Fak Fak, Manokwari, Nabire, Wasior, Serui dan Jayapura. Estimasi 4–7 hari.", "/rute-pengiriman"),
  component: Routes,
});
function Routes() { return <PublicSite page="routes" />; }