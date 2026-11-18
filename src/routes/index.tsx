import { createFileRoute } from "@tanstack/react-router";
import { JourneyHome } from "@/components/journey-home";
import { publicHead } from "@/lib/public-shipping";

export const Route = createFileRoute("/")({
  head: () => {
    const head = publicHead("CV MR EXPRESS — Agen Resmi Pelni Surabaya", "Spesialis pengiriman barang via Kapal Cepat Pelni (Kapal Putih) dari Surabaya ke Ambon, Tual, Sorong, Jayapura dan seluruh Indonesia Timur. WhatsApp 082336829960.", "/");
    return { ...head, meta: [...head.meta, { name: "theme-color", content: "#06142b" }] };
  },
  component: Home,
});
function Home() { return <JourneyHome />; }
