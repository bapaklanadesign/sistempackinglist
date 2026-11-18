import { createFileRoute } from "@tanstack/react-router";
import { PublicSite } from "@/components/public-site";
import { publicHead } from "@/lib/public-shipping";
export const Route = createFileRoute("/tentang-kami")({
  head: () => publicHead("Tentang Kami | CV MR EXPRESS Agen PELNI Surabaya", "Kenali CV MR Express, agen PELNI Surabaya dan spesialis pengiriman barang via kapal putih PELNI ke Indonesia Timur.", "/tentang-kami"),
  component: About,
});
function About() { return <PublicSite page="about" />; }