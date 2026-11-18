import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Anchor, ArrowRight, Boxes, Clock3, Container, Eye, FileCheck2, Handshake, MapPin, MessageCircle, Package, PackageCheck, Phone, Ship, ShipWheel, Shirt, Store, Target, Truck, Wrench, Sofa, Laptop } from "lucide-react";
import kapal from "@/assets/kapal-foto.jpg";
import kontainer from "@/assets/kontainer-foto.jpg";
import ship from "@/assets/pelni-ship.webp.asset.json";
import containers from "@/assets/port-containers.webp.asset.json";
import { RouteMap } from "@/components/journey/route-map";
import { CtaBand, PageHero, SectionHead, SiteShell, useReveal, wa } from "@/components/site/site-chrome";
import { AdvantageGrid } from "@/components/site/site-content";
import { journeyFrames } from "@/lib/journey-frames";
import { destinations, originPort, regions, whatsappDisplay, whatsappInquiryUrl, whatsappRouteUrl, whatsappUrl } from "@/lib/public-shipping";

type Page = "services" | "routes" | "about" | "contact";

const process = [
  { Icon: MessageCircle, title: "Konsultasi via WhatsApp", text: "Sampaikan kota tujuan, jenis dan jumlah barang. Kami bantu informasikan jadwal kapal serta estimasi biaya." },
  { Icon: Truck, title: "Barang diantar ke Surabaya", text: "Barang dikirim atau diantar ke titik pengumpulan kami di Surabaya sesuai jadwal yang disepakati." },
  { Icon: FileCheck2, title: "Pengecekan & Packing List", text: "Barang diperiksa, dihitung per koli, ditimbang, lalu dicatat dalam Packing List resmi." },
  { Icon: Container, title: "Dimuat ke kapal PELNI", text: "Barang dimuat ke kapal cepat PELNI (kapal putih) di Pelabuhan Tanjung Perak." },
  { Icon: ShipWheel, title: "Berlayar ke tujuan", text: "Kapal berlayar menuju pelabuhan tujuan di Indonesia Timur. Status pengiriman dapat ditanyakan via WhatsApp." },
  { Icon: PackageCheck, title: "Tiba & diterima", text: "Barang tiba di pelabuhan tujuan dan siap diambil atau diterima oleh penerima." },
];
const cargo = [
  { Icon: Store, title: "Barang dagangan", text: "Stok toko, sembako kemasan, dan kebutuhan usaha." },
  { Icon: Shirt, title: "Pakaian & tekstil", text: "Pakaian, kain, dan perlengkapan rumah tangga." },
  { Icon: Laptop, title: "Elektronik", text: "Perangkat elektronik dengan kemasan yang aman." },
  { Icon: Wrench, title: "Sparepart & perkakas", text: "Suku cadang kendaraan, mesin, dan alat kerja." },
  { Icon: Sofa, title: "Perabot", text: "Perabot dan barang rumah tangga berukuran sedang." },
  { Icon: Boxes, title: "Kiriman pribadi", text: "Paket keluarga dan barang pindahan." },
];
const packaging = ["Koli", "Kardus", "Karung", "Peti", "Pallet"];
const missions = [
  "Memberikan layanan pengiriman barang via kapal cepat PELNI dengan tarif yang bersahabat.",
  "Menjaga keamanan barang pelanggan sejak diterima di Surabaya hingga tiba di pelabuhan tujuan.",
  "Memberikan informasi jadwal, estimasi, dan status pengiriman secara jelas dan responsif.",
  "Mencatat setiap pengiriman secara rapi melalui Packing List dan Manifest Kapal.",
];

function Services() {
  return <>
    <PageHero crumb="Layanan" eyebrow="Layanan Pengiriman" title={<>Kirim barang via <em>kapal cepat PELNI.</em></>} image={kapal} alt="Kapal putih PELNI berlayar di laut lepas"
      lead="CV MR EXPRESS melayani pengiriman barang dari Surabaya ke berbagai kota di Indonesia Timur melalui kapal cepat PELNI (kapal putih).">
      <a className="j-btn" href={wa} target="_blank" rel="noopener noreferrer">Konsultasi via WhatsApp</a>
      <Link className="j-btn j-btn-ghost" to="/rute-pengiriman">Lihat Rute</Link>
    </PageHero>
    <section className="j-sec"><div className="j-wrap">
      <SectionHead eyebrow="Layanan Utama" title={<>Pengiriman laut,<br /><em>lebih dekat.</em></>} lead="Dua layanan utama kami untuk kebutuhan kirim barang antarpulau." />
      <div className="s-grid-2">
        <article className="s-photo j-rv"><img src={ship.url} alt="Kapal putih PELNI KM Tilong Kabila" loading="lazy" width="1800" height="1200" /><div><Ship aria-hidden="true" /><h3>Via kapal PELNI</h3><p>Pengiriman barang melalui kapal cepat PELNI (kapal putih) dari Surabaya dengan jadwal rutin ke Indonesia Timur.</p></div></article>
        <article className="s-photo j-rv"><img src={containers.url} alt="Kontainer pengiriman di pelabuhan, foto ilustrasi" loading="lazy" width="1800" height="1200" /><div><Package aria-hidden="true" /><h3>Pengiriman barang</h3><p>Diskusikan kebutuhan barang dan tujuan pengiriman Anda bersama CV MR Express — dari satu koli hingga partai besar.</p></div></article>
      </div>
    </div></section>
    <section className="j-sec j-ocean"><div className="j-wrap">
      <SectionHead eyebrow="Proses Pengiriman" title={<>Enam langkah,<br /><em>satu tujuan.</em></>} lead="Alur pengiriman yang jelas dari konsultasi sampai barang diterima." />
      <ol className="s-steps">{process.map(({ Icon, title, text }, i) => <li key={title} className="j-rv" style={{ transitionDelay: `${i * 70}ms` }}><span className="s-step-no">{String(i + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}</ol>
    </div></section>
    <section className="j-sec"><div className="j-wrap">
      <SectionHead eyebrow="Jenis Barang" title={<>Barang yang<br /><em>kami kirim.</em></>} lead="Berbagai jenis barang umum dapat dikirim. Konfirmasikan barang khusus atau berukuran besar melalui WhatsApp terlebih dahulu." />
      <div className="s-grid-3">{cargo.map(({ Icon, title, text }, i) => <article key={title} className="j-card s-mini j-rv" style={{ transitionDelay: `${i * 60}ms` }}><Icon strokeWidth={1.6} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      <div className="s-chips j-rv"><span className="s-chips-label">Kemasan yang dilayani</span>{packaging.map(p => <span key={p} className="s-chip">{p}</span>)}</div>
    </div></section>
    <section className="j-sec j-ocean"><div className="j-wrap">
      <SectionHead eyebrow="Keunggulan Layanan" title="Kenapa Pilih MR Express?" lead="Murah, cepat, dan aman — tiga pilar layanan kami untuk kepuasan pelanggan." />
      <AdvantageGrid />
    </div></section>
    <CtaBand />
  </>;
}

function RoutesPage() {
  const [region, setRegion] = useState("Semua");
  const list = useMemo(() => region === "Semua" ? destinations : destinations.filter(d => d.region === region), [region]);
  return <>
    <PageHero crumb="Rute Pengiriman" eyebrow="Rute Pengiriman" title={<>Dari Surabaya ke <em>Indonesia Timur.</em></>} image={kontainer} alt="Kontainer dan crane di pelabuhan saat senja"
      lead={`Sebelas kota tujuan, semuanya berangkat dari ${originPort.port}, ${originPort.city}. Pilih kota untuk melihat pelabuhan tujuan dan estimasi perjalanan.`}>
      <a className="j-btn" href={wa} target="_blank" rel="noopener noreferrer">Tanya Jadwal Kapal</a>
    </PageHero>
    <section className="j-sec j-ocean"><div className="j-wrap">
      <SectionHead eyebrow="Peta Rute" title={<>Sebelas rute,<br /><em>satu pelabuhan asal.</em></>} lead="Geser dan perbesar peta. Pilih kota untuk melihat jalur dan estimasi." />
      <RouteMap />
    </div></section>
    <section className="j-sec"><div className="j-wrap">
      <SectionHead eyebrow="Daftar Rute" title="Pelabuhan tujuan" lead={`Semua rute berangkat dari ${originPort.port}, ${originPort.city}.`} />
      <div className="s-filter j-rv" role="group" aria-label="Filter provinsi">{["Semua", ...regions].map(r => <button key={r} type="button" aria-pressed={region === r} className={region === r ? "on" : ""} onClick={() => setRegion(r)}>{r}</button>)}</div>
      <div className="s-routes">{list.map(d => <article key={d.name} className="s-route">
        <div className="s-route-line"><span><Anchor aria-hidden="true" />{originPort.city}</span><i aria-hidden="true" /><ArrowRight aria-hidden="true" /></div>
        <h3>{d.name}</h3>
        <p className="s-route-port"><MapPin aria-hidden="true" />{d.port}</p>
        <p className="s-route-region">{d.region}</p>
        <div className="s-route-foot"><span><Clock3 aria-hidden="true" />± {d.days} hari</span><a href={whatsappRouteUrl(d.name)} target="_blank" rel="noopener noreferrer">Tanya rute<ArrowRight aria-hidden="true" /></a></div>
      </article>)}</div>
      <p className="j-note">Estimasi perjalanan sesuai informasi layanan dan dapat berubah mengikuti jadwal kapal PELNI. Konfirmasikan jadwal keberangkatan melalui WhatsApp.</p>
    </div></section>
    <CtaBand />
  </>;
}

function About() {
  return <>
    <PageHero crumb="Tentang Kami" eyebrow="Tentang Kami" title={<>Tentang <em>CV MR EXPRESS.</em></>} image={ship.url} alt="Kapal putih PELNI berlayar"
      lead="Agen resmi PELNI Surabaya. Menghubungkan pelabuhan, mengantarkan tujuan — aman, amanah, dan responsif." />
    <section className="j-sec"><div className="j-wrap j-about">
      <div className="j-rv"><p className="j-eyebrow">Profil Perusahaan</p><h2>Agen resmi<br /><em>PELNI Surabaya.</em></h2>
        <p className="j-lead">CV MR EXPRESS merupakan agen resmi Pelni Surabaya yang berspesialisasi dalam layanan pengiriman barang melalui Kapal Cepat Pelni (Kapal Putih) ke berbagai tujuan di Indonesia Timur.</p>
        <p className="j-lead">Kami berkomitmen memberikan layanan pengiriman dengan harga bersahabat, waktu pengiriman terbaik, keamanan barang, serta pelayanan yang responsif.</p>
      </div>
      <div className="j-collage j-rv">
        <img alt="Crane pelabuhan memuat kontainer ke kapal" src={journeyFrames[34]} loading="lazy" width="576" height="1024" />
        <img alt="Kapal PELNI berlayar" src={journeyFrames[48]} loading="lazy" width="576" height="1024" />
        <img alt="Pelabuhan tujuan" src={journeyFrames[70]} loading="lazy" width="576" height="1024" />
      </div>
    </div></section>
    <section className="j-sec j-ocean"><div className="j-wrap">
      <SectionHead eyebrow="Perjalanan Kami" title={<>Berawal dari<br /><em>Pelabuhan Surabaya.</em></>} />
      <ol className="s-timeline">
        <li className="j-rv"><Anchor aria-hidden="true" /><div><h3>Berangkat dari Surabaya</h3><p>CV MR EXPRESS hadir di Surabaya untuk menjawab kebutuhan masyarakat dan pelaku usaha yang ingin mengirim barang ke Indonesia Timur dengan cara yang terjangkau.</p></div></li>
        <li className="j-rv"><Handshake aria-hidden="true" /><div><h3>Menjadi agen resmi PELNI</h3><p>Sebagai agen resmi PELNI Surabaya, kami memanfaatkan jadwal rutin kapal cepat PELNI (kapal putih) untuk melayani pengiriman barang antarpulau.</p></div></li>
        <li className="j-rv"><Ship aria-hidden="true" /><div><h3>Sebelas rute Indonesia Timur</h3><p>Kini kami melayani pengiriman ke Ambon, Tual, Ternate, Kaimana, Sorong, Fak Fak, Manokwari, Nabire, Wasior, Serui, dan Jayapura.</p></div></li>
      </ol>
    </div></section>
    <section className="j-sec"><div className="j-wrap">
      <div className="s-grid-2 s-vm">
        <article className="j-card j-rv"><Eye strokeWidth={1.6} aria-hidden="true" /><p className="j-eyebrow">Visi</p><h3 className="s-vm-title">Menjadi mitra pengiriman barang via laut yang paling dipercaya untuk menghubungkan Surabaya dengan Indonesia Timur.</h3></article>
        <article className="j-card j-rv"><Target strokeWidth={1.6} aria-hidden="true" /><p className="j-eyebrow">Misi</p><ul className="s-list">{missions.map(m => <li key={m}>{m}</li>)}</ul></article>
      </div>
    </div></section>
    <section className="j-sec j-ocean"><div className="j-wrap">
      <SectionHead eyebrow="Keunggulan" title="Kenapa Pilih MR Express?" lead="Murah, cepat, dan aman — tiga pilar layanan kami untuk kepuasan pelanggan." />
      <AdvantageGrid />
    </div></section>
    <CtaBand />
  </>;
}

function Contact() {
  const [f, setF] = useState({ name: "", destination: "", cargo: "", note: "" });
  const submit = (e: FormEvent) => { e.preventDefault(); window.open(whatsappInquiryUrl(f), "_blank", "noopener,noreferrer"); };
  return <>
    <PageHero crumb="Kontak" eyebrow="Kontak" title={<>Hubungi <em>CV MR EXPRESS.</em></>} image={containers.url} alt="Kontainer pengiriman di pelabuhan"
      lead="Bicarakan tujuan, kebutuhan barang, dan estimasi pengiriman Anda bersama kami. Tim kami siap membantu melalui WhatsApp." />
    <section className="j-sec"><div className="j-wrap">
      <div className="s-grid-3">
        <a className="j-card s-contact j-rv" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle strokeWidth={1.6} aria-hidden="true" /><h3>WHATSAPP</h3><p className="s-contact-big">{whatsappDisplay}</p><p>Chat langsung dengan tim kami.</p></a>
        <a className="j-card s-contact j-rv" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Phone strokeWidth={1.6} aria-hidden="true" /><h3>TELEPON</h3><p className="s-contact-big">{whatsappDisplay}</p><p>Hubungi kami untuk informasi pengiriman.</p></a>
        <div className="j-card s-contact j-rv"><MapPin strokeWidth={1.6} aria-hidden="true" /><h3>LOKASI</h3><p className="s-contact-big">{originPort.city}, {originPort.region}</p><p>Keberangkatan dari {originPort.port}.</p></div>
      </div>
    </div></section>
    <section className="j-sec j-ocean"><div className="j-wrap s-contact-grid">
      <form className="s-form j-rv" onSubmit={submit} aria-labelledby="form-title">
        <p className="j-eyebrow">Formulir Pengiriman</p>
        <h2 id="form-title">Kirim pertanyaan<br /><em>via WhatsApp.</em></h2>
        <p className="j-lead">Isi data berikut, lalu pesan siap terkirim ke WhatsApp kami.</p>
        <label>Nama<input className="s-input" value={f.name} maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nama Anda" autoComplete="name" /></label>
        <label>Kota tujuan<select className="s-input" required value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })}>
          <option value="">Pilih kota tujuan</option>{destinations.map(d => <option key={d.name} value={d.name}>{d.name} — {d.port}</option>)}</select></label>
        <label>Jenis barang<input className="s-input" value={f.cargo} maxLength={120} onChange={e => setF({ ...f, cargo: e.target.value })} placeholder="Contoh: 5 koli pakaian" /></label>
        <label>Catatan<textarea className="s-input" rows={3} value={f.note} maxLength={500} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Perkiraan berat, jadwal, atau pertanyaan lain" /></label>
        <button type="submit" className="j-btn j-btn-wa">Kirim ke WhatsApp</button>
      </form>
      <div className="s-map j-rv">
        <iframe title="Peta Pelabuhan Tanjung Perak, Surabaya" src="https://www.google.com/maps?q=Pelabuhan+Tanjung+Perak+Surabaya&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        <p><MapPin aria-hidden="true" />{originPort.port}, {originPort.city} — pelabuhan keberangkatan kapal PELNI.</p>
      </div>
    </div></section>
    <CtaBand />
  </>;
}

export function PublicSite({ page }: { page: Page }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, page);
  return <SiteShell><div ref={root}>
    {page === "services" && <Services />}
    {page === "routes" && <RoutesPage />}
    {page === "about" && <About />}
    {page === "contact" && <Contact />}
  </div></SiteShell>;
}
