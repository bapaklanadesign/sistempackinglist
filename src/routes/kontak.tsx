import { createFileRoute } from "@tanstack/react-router";
import { PublicSite } from "@/components/public-site";
import { publicHead } from "@/lib/public-shipping";
export const Route = createFileRoute("/kontak")({
  head: () => publicHead("Kontak WhatsApp | CV MR EXPRESS", "Hubungi CV MR Express Agen PELNI Surabaya melalui WhatsApp 082336829960 untuk kebutuhan pengiriman barang dan informasi rute.", "/kontak"),
  component: Contact,
});
function Contact() { return <PublicSite page="contact" />; }