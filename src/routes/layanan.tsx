import { createFileRoute } from "@tanstack/react-router";
import { PublicSite } from "@/components/public-site";
import { publicHead } from "@/lib/public-shipping";
export const Route = createFileRoute("/layanan")({
  head: () => publicHead("Layanan Pengiriman Barang | CV MR EXPRESS", "Layanan pengiriman barang CV MR Express via kapal cepat PELNI (kapal putih) dari Surabaya. Konsultasikan kebutuhan pengiriman melalui WhatsApp.", "/layanan"),
  component: Services,
});
function Services() { return <PublicSite page="services" />; }