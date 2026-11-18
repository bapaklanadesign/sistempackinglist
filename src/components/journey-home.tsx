import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { journeyFrames } from "@/lib/journey-frames";
import { whatsappDisplay } from "@/lib/public-shipping";
import { SiteFooter, SiteNav, wa } from "@/components/site/site-chrome";
import { AdvantageGrid } from "@/components/site/site-content";
import { RouteMap } from "@/components/journey/route-map";

/** Smooth eased scroll to an in-page section, offset for the fixed navbar. */
function goTo(selector: string) {
  const el = document.querySelector(selector); if (!el) return;
  const target = el.getBoundingClientRect().top + scrollY - 64, from = scrollY, t0 = performance.now();
  const d = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1800;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / d), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    scrollTo(0, from + (target - from) * e); if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function Scene({ children }: { children: ReactNode }) {
  return <section className="j-scene" data-scene><div className="j-stage">{children}</div></section>;
}
function Caption({ pos, win, eyebrow, title, text, children }: { pos: string; win: string; eyebrow: string; title: ReactNode; text: string; children?: ReactNode }) {
  return <div className={`j-blk ${pos}`} data-win={win}><p className="j-eyebrow">{eyebrow}</p><h2>{title}</h2><p className="j-lead">{text}</p>{children}</div>;
}

export function JourneyHome() {
  const root = useRef<HTMLDivElement>(null), story = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLImageElement>(null), hudBar = useRef<HTMLElement>(null), hudNum = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false), [booted, setBooted] = useState(false);

  useEffect(() => {
    let cancelled = false, cleanup: (() => void) | undefined;
    setBooted(true);
    import("@/components/journey/journey-engine").then(({ mountJourney }) => {
      if (cancelled || !root.current || !story.current || !canvas.current || !fallback.current) return;
      cleanup = mountJourney({ root: root.current, story: story.current, canvas: canvas.current, fallback: fallback.current,
        hudBar: hudBar.current, hudNum: hudNum.current, frames: journeyFrames, onReady: () => setReady(true) });
    }).catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  useEffect(() => {
    const el = root.current; if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
    el.querySelectorAll(".j-rv").forEach(n => { n.classList.add("j-rv-wait"); io.observe(n); });
    return () => io.disconnect();
  }, []);

  const jump = (selector: string) => () => goTo(selector);

  return <div ref={root} className={`journey-site ${booted ? "is-booted" : ""} ${ready ? "is-ready" : ""}`}>
    <div className="j-backdrop" aria-hidden="true">
      <img ref={fallback} className="j-fallback" src={journeyFrames[0]} alt="" width="576" height="1024" fetchPriority="high" />
      <canvas ref={canvas} className="j-canvas" />
    </div>

    <SiteNav />

    <main>
      <div ref={story} className="j-story">
        <Scene>
          <div className="j-blk pos-a j-hero" data-win="-1,-.5,.55,.85">
            <p className="j-eyebrow">AGEN RESMI PELNI SURABAYA</p>
            <h1><span className="j-ln"><span>CV MR</span></span><span className="j-ln"><span><em>EXPRESS</em></span></span></h1>
            <p className="j-lead">Spesialis Pengiriman Barang via Kapal Cepat Pelni (Kapal Putih) ke Seluruh Indonesia Timur.</p>
            <div className="j-cta"><a className="j-btn" href={wa} target="_blank" rel="noopener noreferrer">Kirim Sekarang via WhatsApp</a><button className="j-btn j-btn-ghost" type="button" onClick={jump("#rute")}>Lihat Rute</button></div>
          </div>
          <div className="j-blk pos-d j-cue" data-win="-1,-.5,.4,.7"><div className="j-scrollcue"><i /><span>Gulir untuk menjelajah</span></div></div>
        </Scene>
        <Scene><Caption pos="pos-b" win=".08,.25,.75,.95" eyebrow="01 — Truck Arrival" title={<>Truk tiba di<br />Pelabuhan Surabaya.</>} text="Armada CV MR EXPRESS membawa kontainer langsung menuju area crane." /></Scene>
        <Scene><Caption pos="pos-a" win=".08,.25,.75,.95" eyebrow="02 — Crane Lifting" title={<>Crane mengunci<br />dan mengangkat.</>} text="Spreader turun, mengunci empat sudut kontainer, lalu mengangkatnya secara vertikal." /></Scene>
        <Scene><Caption pos="pos-b" win=".08,.3,.75,.95" eyebrow="03 — Loading" title={<>Naik ke kapal<br />putih PELNI.</>} text="Kontainer diturunkan presisi ke dek dan disusun rapi." /></Scene>
        <Scene><Caption pos="pos-a" win=".08,.3,.75,.95" eyebrow="04 — Departure" title={<>Berlayar<br />meninggalkan Surabaya.</>} text="Kapal bergerak perlahan menuju lautan Indonesia." /></Scene>
        <Scene><Caption pos="pos-b" win=".1,.25,.85,.97" eyebrow="05 — Routes" title={<>11 rute ke<br />Indonesia Timur.</>} text="Surabaya adalah pusat keberangkatan. Setiap rute adalah tujuan tersendiri.">
          <div className="j-cta"><button className="j-btn" type="button" onClick={jump("#rute")}>Jelajahi Peta Rute</button></div>
        </Caption></Scene>
        <Scene><Caption pos="pos-a" win=".08,.25,.75,.95" eyebrow="06 — Arrival" title={<>Tiba di<br />pelabuhan tujuan.</>} text="Kontainer diturunkan dan diantar ke alamat penerima." /></Scene>
        <Scene><div className="j-blk pos-top" data-win=".25,.5,3,4"><button className="j-btn j-btn-ghost" type="button" onClick={jump("#keunggulan")}>Jelajahi Layanan Kami ↓</button></div></Scene>
      </div>

      <div className="j-after">
        <section id="keunggulan" className="j-sec"><div className="j-wrap">
          <p className="j-eyebrow">Keunggulan</p><h2 className="j-rv">Kenapa Pilih MR Express?</h2>
          <p className="j-lead j-rv">Murah, cepat, dan aman — tiga pilar layanan kami untuk kepuasan pelanggan.</p>
          <AdvantageGrid />
        </div></section>
        <section id="rute" className="j-sec j-ocean"><div className="j-wrap">
          <p className="j-eyebrow">Rute Pengiriman</p><h2 className="j-rv">Dari Surabaya ke<br /><em>Indonesia Timur.</em></h2>
          <p className="j-lead j-rv">Sebelas tujuan, masing-masing berangkat langsung dari Surabaya. Pilih kota untuk melihat jalur dan estimasi.</p>
          <RouteMap />
          <p className="j-note">Estimasi perjalanan dapat berubah. Konfirmasikan jadwal melalui WhatsApp atau lihat <Link to="/rute-pengiriman">halaman rute pengiriman</Link>.</p>
        </div></section>
        <section id="tentang" className="j-sec"><div className="j-wrap j-about">
          <div className="j-rv"><p className="j-eyebrow">Tentang Kami</p><h2>Tentang<br />CV MR EXPRESS</h2>
            <p className="j-lead">CV MR EXPRESS merupakan agen resmi Pelni Surabaya yang berspesialisasi dalam layanan pengiriman barang melalui Kapal Cepat Pelni (Kapal Putih) ke berbagai tujuan di Indonesia Timur.</p>
            <p className="j-lead">Kami berkomitmen memberikan layanan pengiriman dengan harga bersahabat, waktu pengiriman terbaik, keamanan barang, serta pelayanan yang responsif.</p>
            <Link to="/tentang-kami" className="j-more">Selengkapnya tentang kami →</Link>
          </div>
          <div className="j-collage j-rv">
            <img alt="Crane pelabuhan memuat kontainer ke kapal" src={journeyFrames[34]} loading="lazy" width="576" height="1024" />
            <img alt="Kapal PELNI berlayar" src={journeyFrames[48]} loading="lazy" width="576" height="1024" />
            <img alt="Pelabuhan tujuan" src={journeyFrames[70]} loading="lazy" width="576" height="1024" />
          </div>
        </div></section>
        <section id="kontak" className="j-sec j-cta-sec"><div className="j-wrap j-center">
          <h2 className="j-rv">SIAP MENGIRIM BARANG<br /><em>KE INDONESIA TIMUR?</em></h2>
          <p className="j-lead j-rv">Percayakan kebutuhan pengiriman barang Anda kepada CV MR EXPRESS. Nikmati layanan pengiriman laut yang murah, cepat, dan aman.</p>
          <a className="j-btn j-btn-big j-rv" href={wa} target="_blank" rel="noopener noreferrer">KIRIM SEKARANG VIA WHATSAPP</a>
          <a className="j-phone" href={wa} target="_blank" rel="noopener noreferrer">{whatsappDisplay}</a>
        </div></section>
        <SiteFooter />
      </div>
    </main>

    <div className="j-hud" aria-hidden="true"><i ref={hudBar} /><span ref={hudNum}>01 · Hero</span></div>
    <div className="j-loader" aria-hidden="true"><span>Memuat perjalanan…</span></div>
  </div>;
}
