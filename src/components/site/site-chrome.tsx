import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { ArrowUpRight, MapPin, MessageCircle, Phone } from "lucide-react";
import logo from "@/assets/mr-express-home-logo.png.asset.json";
import { destinations, originPort, whatsappDisplay, whatsappMessageUrl, whatsappUrl } from "@/lib/public-shipping";

/** One navigation list for header, mobile menu and footer on every public page. */
export const siteNavigation = [
  { to: "/", label: "Beranda" }, { to: "/layanan", label: "Layanan" },
  { to: "/rute-pengiriman", label: "Rute Pengiriman" }, { to: "/tentang-kami", label: "Tentang Kami" },
  { to: "/kontak", label: "Kontak" }, { to: "/login", label: "Login" },
] as const;
export const wa = whatsappMessageUrl();

/** Fixed site header. `overlay` keeps it transparent over a hero until the visitor scrolls. */
export function SiteNav({ overlay = true }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  const path = useRouterState({ select: s => s.location.pathname });
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const set = () => setScrolled(scrollY > 80); set();
    addEventListener("scroll", set, { passive: true });
    return () => removeEventListener("scroll", set);
  }, []);
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => { html.style.overflow = prev; removeEventListener("keydown", onKey); };
  }, [open]);
  return <header className={`j-nav ${scrolled || !overlay ? "solid" : ""} ${open ? "open" : ""}`}>
    <Link to="/" className="j-logo" aria-label="CV MR Express — Beranda"><img src={logo.url} alt="" width="34" height="34" /><b>CV MR EXPRESS</b></Link>
    <nav id="j-links" className="j-links" aria-label="Navigasi utama">
      {siteNavigation.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }}>{n.label}</Link>)}
    </nav>
    <a className="j-btn j-btn-sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    <button type="button" className="j-burger" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="j-links" onClick={() => setOpen(!open)}><i /><i /></button>
  </header>;
}

export function SiteFooter() {
  return <footer className="j-footer s-footer"><div className="j-wrap">
    <div className="s-foot-grid">
      <div>
        <Link to="/" className="j-logo"><img src={logo.url} alt="" width="34" height="34" /><b>CV MR EXPRESS</b></Link>
        <p className="s-foot-tag">AGEN RESMI PELNI SURABAYA · Menghubungkan Pelabuhan, Mengantarkan Tujuan.</p>
        <a className="j-btn j-btn-wa s-foot-btn" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />Chat WhatsApp</a>
      </div>
      <nav aria-label="Navigasi footer"><h3>Navigasi</h3>{siteNavigation.map(n => <Link key={n.to} to={n.to}>{n.label === "Login" ? "Login MR Express Ledger" : n.label}</Link>)}</nav>
      <div><h3>Tujuan Populer</h3>{destinations.filter((_, i) => [0, 4, 6, 10].includes(i)).map(d => <Link key={d.name} to="/rute-pengiriman">Surabaya → {d.name}</Link>)}</div>
      <div><h3>Kontak</h3>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Phone aria-hidden="true" />{whatsappDisplay}</a>
        <span><MapPin aria-hidden="true" />{originPort.city}, {originPort.region}</span>
        <Link to="/kontak">Halaman kontak<ArrowUpRight aria-hidden="true" /></Link>
      </div>
    </div>
    <div className="s-foot-base">
      <small>© {new Date().getFullYear()} CV MR EXPRESS. Seluruh hak dilindungi.</small>
      <small>Website ini dikembangkan oleh <a href="https://tretandevelopment.web.app/" target="_blank" rel="noopener noreferrer">tretan developer</a></small>
    </div>
  </div></footer>;
}

/** Fades sections in as they enter view (skipped for reduced motion). */
export function useReveal(root: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = root.current; if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    el.querySelectorAll(".j-rv:not(.in)").forEach(n => { n.classList.add("j-rv-wait"); io.observe(n); });
    return () => io.disconnect();
  }, [root, key]);
}

export function PageHero({ eyebrow, title, lead, image, alt, crumb, children }: { eyebrow: string; title: ReactNode; lead: string; image: string; alt: string; crumb: string; children?: ReactNode }) {
  return <section className="s-hero">
    <img src={image} alt={alt} width="1808" height="1200" fetchPriority="high" />
    <div className="j-wrap s-hero-in">
      <nav aria-label="Breadcrumb" className="s-crumb"><Link to="/">Beranda</Link><span aria-hidden="true">/</span><span aria-current="page">{crumb}</span></nav>
      <p className="j-eyebrow">{eyebrow}</p>
      <h1><span className="j-ln"><span>{title}</span></span></h1>
      <p className="j-lead">{lead}</p>
      {children && <div className="j-cta">{children}</div>}
    </div>
  </section>;
}

export function SectionHead({ eyebrow, title, lead, center = false }: { eyebrow: string; title: ReactNode; lead?: string; center?: boolean }) {
  return <div className={`s-head ${center ? "j-center" : ""}`}><p className="j-eyebrow">{eyebrow}</p><h2 className="j-rv">{title}</h2>{lead && <p className="j-lead j-rv">{lead}</p>}</div>;
}

export function CtaBand({ title = <>SIAP MENGIRIM BARANG<br /><em>KE INDONESIA TIMUR?</em></>, text = "Percayakan kebutuhan pengiriman barang Anda kepada CV MR EXPRESS. Nikmati layanan pengiriman laut yang murah, cepat, dan aman." }: { title?: ReactNode; text?: string }) {
  return <section className="j-sec j-cta-sec"><div className="j-wrap j-center">
    <h2 className="j-rv">{title}</h2>
    <p className="j-lead j-rv">{text}</p>
    <a className="j-btn j-btn-big j-rv" href={wa} target="_blank" rel="noopener noreferrer">KIRIM SEKARANG VIA WHATSAPP</a>
    <a className="j-phone" href={wa} target="_blank" rel="noopener noreferrer">{whatsappDisplay}</a>
  </div></section>;
}

/** Shared frame for every public page except the scroll journey homepage. */
export function SiteShell({ children, overlay = true, className = "" }: { children: ReactNode; overlay?: boolean; className?: string }) {
  return <div className={`journey-site site-page ${className}`}>
    <SiteNav overlay={overlay} />
    <main id="konten">{children}</main>
    <SiteFooter />
  </div>;
}
