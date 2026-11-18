import { Clock, MessageCircle, ShieldCheck, Tag, Zap } from "lucide-react";

/** Company advantages shared by the homepage, Layanan and Tentang Kami. */
export const advantages = [
  { title: "HARGA MURAH", text: "Tarif bersahabat untuk semua jenis pengiriman barang.", Icon: Tag },
  { title: "PENGIRIMAN CEPAT", text: "Via kapal cepat Pelni dengan estimasi waktu terbaik.", Icon: Zap },
  { title: "AMAN & AMANAH", text: "Barang dijamin aman dengan penanganan profesional.", Icon: ShieldCheck },
  { title: "TEPAT WAKTU", text: "Komitmen pengiriman sesuai estimasi yang dijanjikan.", Icon: Clock },
  { title: "LAYANAN RESPONSIF", text: "Tim siap membantu via WhatsApp kapan saja.", Icon: MessageCircle },
];

export function AdvantageGrid() {
  return <div className="j-adv">{advantages.map(({ title, text, Icon }, i) => <article key={title} className="j-card j-rv" style={{ transitionDelay: `${i * 80}ms` }}><Icon strokeWidth={1.6} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>;
}
