import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { destinations, whatsappRouteUrl } from "@/lib/public-shipping";

// Equirectangular projection: lon 106..142, lat 4..-10 (26 px per degree).
const S = 26, W = 936, H = 364;
const proj = (lon: number, lat: number) => [(lon - 106) * S, (4 - lat) * S] as const;
const ORIGIN = { lon: 112.75, lat: -7.25 };
const COORDS: Record<string, { lon: number; lat: number; lab: [number, number, "start" | "middle" | "end"] }> = {
  Ambon: { lon: 128.18, lat: -3.7, lab: [-8, 12, "end"] }, Tual: { lon: 132.75, lat: -5.63, lab: [0, 14, "middle"] },
  Ternate: { lon: 127.38, lat: .79, lab: [-8, -6, "end"] }, Kaimana: { lon: 133.69, lat: -3.65, lab: [0, 14, "middle"] },
  "Fak Fak": { lon: 132.3, lat: -2.93, lab: [-8, 4, "end"] }, Sorong: { lon: 131.26, lat: -.88, lab: [-8, -6, "end"] },
  Manokwari: { lon: 134.08, lat: -.86, lab: [0, -9, "middle"] }, Nabire: { lon: 135.48, lat: -3.37, lab: [8, 14, "start"] },
  Wasior: { lon: 134.5, lat: -2.72, lab: [-8, 4, "end"] }, Serui: { lon: 136.25, lat: -1.87, lab: [8, -6, "start"] },
  Jayapura: { lon: 140.72, lat: -2.53, lab: [0, 14, "middle"] },
};
// Simplified coastlines (lon,lat pairs).
const LAND: number[][] = [
  [106,-6, 106.5,-6, 108.5,-6.4, 110.5,-6.6, 112.5,-6.9, 114.4,-7.7, 114.4,-8.7, 111,-8.3, 108,-7.8, 106,-7.0],
  [106,2, 109,1.9, 111,1.8, 113,3.2, 115,4.8, 117,7, 119,5, 117.5,1, 116.5,-1.5, 116,-3.5, 114.5,-4, 111,-3, 110,-2, 109,-.5, 106,-1.5],
  [119.5,.5, 121,1, 124.8,1.5, 123,.3, 121.5,.4, 122.8,-.8, 123.2,-1.8, 121.8,-1.9, 121.9,-3, 122.9,-4.1, 122.3,-5.3, 121.4,-4.6, 121.1,-2.9, 120.3,-2.8, 120.4,-5.5, 119.5,-5.6, 119.4,-3.4, 118.8,-2.8, 119.8,-.5],
  [127.5,2.2, 128.5,2, 128,1.2, 128.6,.6, 128.2,-.7, 127.6,-.3, 128,.5, 127.4,1.1],
  [128,-3.3, 130.8,-3, 130.5,-3.5, 128.3,-3.9], [126.5,-3.2, 127.5,-3.3, 127,-3.9],
  [114.4,-8.1, 115.7,-8.2, 115.2,-8.8], [115.9,-8.3, 116.7,-8.4, 116.4,-8.9], [116.8,-8.4, 119,-8.3, 118.5,-8.9, 117,-8.9],
  [119.9,-8.5, 123,-8.3, 122.8,-8.8, 120,-8.9], [119.2,-9.4, 120.8,-9.6, 119.6,-10], [123.5,-9.2, 127,-8.4, 125,-10, 123.5,-10],
  [132.6,-5.4, 132.9,-5.5, 132.8,-5.9, 132.6,-5.8], [135.5,-1.8, 136.8,-1.7, 136.9,-1.9, 135.6,-2],
  [131,-.9, 132.3,-.3, 133.7,-.7, 134.1,-1, 134,-1.9, 134.5,-2.7, 135.4,-3.3, 135.9,-3.4, 136.4,-2.7, 136.8,-2.2, 137.2,-1.7, 138.5,-1.7, 140,-2.4, 141,-2.6, 142,-2.7, 142,-10, 139,-8.2, 138,-8.1, 137.4,-7.3, 138,-5.8, 136.5,-4.7, 135,-4, 133.8,-3.8, 133,-3.4, 132.5,-3.3, 132.1,-2.6, 131.9,-2.7, 132.3,-2.1, 131.4,-2.2, 131.3,-1.9, 130.9,-1.4],
];
const landPaths = LAND.map(pts => { let d = ""; for (let i = 0; i < pts.length; i += 2) { const [x, y] = proj(pts[i] ?? 0, pts[i + 1] ?? 0); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } return d + "Z"; });
const [ox, oy] = proj(ORIGIN.lon, ORIGIN.lat);

export function RouteMap() {
  const routes = useMemo(() => destinations.map((r, i) => {
    const c = COORDS[r.name] ?? { lon: ORIGIN.lon, lat: ORIGIN.lat, lab: [0, 14, "middle"] as [number, number, "middle"] };
    const [x, y] = proj(c.lon, c.lat), mx = (ox + x) / 2, my = (oy + y) / 2, dx = x - ox, dy = y - oy, len = Math.hypot(dx, dy);
    const off = (i % 2 ? -1 : 1) * len * .16, cx = mx - dy / len * off, cy = my + dx / len * off;
    return { ...r, i, x, y, lab: c.lab, d: `M${ox} ${oy}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` };
  }), []);
  const [sel, setSel] = useState(-1);
  const [tip, setTip] = useState<{ i: number; left: number; top: number } | null>(null);
  const selRef = useRef(sel); selRef.current = sel;
  const svg = useRef<SVGSVGElement>(null), box = useRef<HTMLDivElement>(null);
  const paths = useRef<Array<SVGPathElement | null>>([]), ships = useRef<Array<SVGPathElement | null>>([]), marks = useRef<Array<SVGGElement | null>>([]);
  const vb = useRef({ x: 0, y: 0, w: W, h: H }), home = useRef({ x: 0, y: 0, w: W, h: H });

  const apply = () => { const v = vb.current, s = svg.current; if (!s) return; s.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`); s.style.touchAction = v.w < W - 1 ? "none" : "pan-y"; };
  const zoom = (f: number, cx = vb.current.x + vb.current.w / 2, cy = vb.current.y + vb.current.h / 2) => {
    const v = vb.current, w = Math.min(W, Math.max(200, v.w / f)), k = w / v.w;
    const n = { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w, h: v.h * k };
    n.x = Math.max(-100, Math.min(W + 100 - n.w, n.x)); n.y = Math.max(-60, Math.min(H + 60 - n.h, n.y));
    vb.current = n; apply();
  };

  useEffect(() => {
    const s = svg.current, b = box.current; if (!s || !b) return;
    if (innerWidth < 700) { home.current = { x: 250, y: 30, w: 600, h: 300 }; vb.current = { ...home.current }; }
    apply();
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r = s.getBoundingClientRect(), v = vb.current; zoom(e.deltaY < 0 ? 1.15 : .87, v.x + (e.clientX - r.left) / r.width * v.w, v.y + (e.clientY - r.top) / r.height * v.h); };
    s.addEventListener("wheel", onWheel, { passive: false });
    let drag: { x: number; y: number; vx: number; vy: number } | null = null;
    const down = (e: PointerEvent) => { if (e.pointerType === "mouse" || vb.current.w < W - 1) { drag = { x: e.clientX, y: e.clientY, vx: vb.current.x, vy: vb.current.y }; s.setPointerCapture(e.pointerId); } };
    const move = (e: PointerEvent) => { if (!drag) return; const r = s.getBoundingClientRect(), v = vb.current; v.x = drag.vx - (e.clientX - drag.x) * v.w / r.width; v.y = drag.vy - (e.clientY - drag.y) * v.h / r.height; apply(); };
    const up = () => { drag = null; };
    s.addEventListener("pointerdown", down); s.addEventListener("pointermove", move); s.addEventListener("pointerup", up);
    // Ships sail every route only while the map is visible.
    let vis = false, raf = 0;
    const io = new IntersectionObserver(([e]) => { vis = !!e?.isIntersecting; }); io.observe(b);
    const lens = paths.current.map(p => p?.getTotalLength() ?? 0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      if (vis) routes.forEach(r => {
        const p = paths.current[r.i], ship = ships.current[r.i]; if (!p || !ship) return;
        const len = lens[r.i] ?? 0, t = reduced ? .5 : ((now / 1000) / (r.days * 2.2) + r.i * .13) % 1, L = t * len;
        const a = p.getPointAtLength(L), c = p.getPointAtLength(Math.min(len, L + 1)), ang = Math.atan2(c.y - a.y, c.x - a.x) * 180 / Math.PI;
        const cur = selRef.current;
        ship.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${r.i === cur ? 1.5 : 1})`);
        ship.style.opacity = cur < 0 || r.i === cur ? "1" : ".25";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); s.removeEventListener("wheel", onWheel); s.removeEventListener("pointerdown", down); s.removeEventListener("pointermove", move); s.removeEventListener("pointerup", up); };
  }, [routes]);

  const showTip = (i: number) => {
    const b = box.current?.getBoundingClientRect(), m = marks.current[i]?.getBoundingClientRect(); if (!b || !m) return;
    setTip({ i, left: m.left - b.left + m.width / 2, top: m.top - b.top - 8 });
  };
  const select = (i: number, scrollTo = false) => { setSel(i); if (scrollTo) box.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const r = sel >= 0 ? routes[sel] : null;

  return <div>
    <div ref={box} className="j-mapbox">
      <svg ref={svg} className="j-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Peta rute pengiriman dari Surabaya ke 11 kota tujuan">
        <defs>
          <filter id="j-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="j-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="j-sea-top" /><stop offset="1" className="j-sea-bottom" /></linearGradient>
        </defs>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="url(#j-sea)" />
        {Array.from({ length: 10 }, (_, k) => 106 + k * 4).map(lon => <line key={"v" + lon} x1={(lon - 106) * S} y1={-400} x2={(lon - 106) * S} y2={H + 400} className="j-grat" />)}
        {Array.from({ length: 8 }, (_, k) => 4 - k * 2).map(lat => <line key={"h" + lat} x1={-400} y1={(4 - lat) * S} x2={W + 400} y2={(4 - lat) * S} className="j-grat" />)}
        {landPaths.map((d, k) => <path key={k} d={d} className="j-land" />)}
        {routes.map(q => <path key={q.name} ref={el => { paths.current[q.i] = el; }} d={q.d} className={`j-route ${q.i === sel ? "on" : ""}`} />)}
        <g>{routes.map(q => <path key={q.name} ref={el => { ships.current[q.i] = el; }} d="M7 0L-5-3.6-5 3.6Z" className="j-ship" transform={`translate(${ox} ${oy})`} />)}</g>
        <g>{routes.map(q => <g key={q.name} ref={el => { marks.current[q.i] = el; }} className={`j-mk ${q.i === sel ? "on" : ""}`} tabIndex={0} role="button" aria-label={`${q.name}, estimasi ${q.days} hari`}
          onClick={() => select(q.i)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(q.i); } }}
          onPointerEnter={() => showTip(q.i)} onPointerLeave={() => setTip(null)}>
          <circle cx={q.x} cy={q.y} r={14} fill="transparent" /><circle cx={q.x} cy={q.y} r={7} className="ring" /><circle cx={q.x} cy={q.y} r={3.4} className="dot" />
          <text x={q.x + q.lab[0]} y={q.y + q.lab[1]} textAnchor={q.lab[2]}>{q.name}</text>
        </g>)}</g>
        <circle cx={ox} cy={oy} r={11} className="j-origin-ring" /><circle cx={ox} cy={oy} r={5} className="j-origin" />
        <text x={ox} y={oy + 22} textAnchor="middle" className="j-olab">SURABAYA (SBY)</text>
      </svg>
      <div className="j-zoom">
        <button type="button" aria-label="Perbesar" onClick={() => zoom(1.4)}><Plus /></button>
        <button type="button" aria-label="Perkecil" onClick={() => zoom(.7)}><Minus /></button>
        <button type="button" aria-label="Reset" onClick={() => { vb.current = { ...home.current }; apply(); }}><RotateCcw /></button>
      </div>
      {tip && routes[tip.i] && <div className="j-tip" style={{ left: tip.left, top: tip.top }}><b>{routes[tip.i]?.name}</b><span>Estimasi {routes[tip.i]?.days} hari</span></div>}
    </div>
    <div className={`j-panel ${r ? "has" : ""}`} aria-live="polite">
      {r ? <>
        <div><small>Rute terpilih</small><h3>Surabaya → {r.name}</h3></div>
        <div className="j-eta"><small>Estimasi pengiriman</small><b>{r.days} Hari</b></div>
        <a className="j-btn j-btn-wa" href={whatsappRouteUrl(r.name)} target="_blank" rel="noopener noreferrer">Pesan via WhatsApp</a>
      </> : <p>Pilih kota tujuan pada peta atau kartu untuk melihat jalur dan estimasi pengiriman.</p>}
    </div>
    <div className="j-rcards">{routes.map(q => <button key={q.name} type="button" className={`j-rc ${q.i === sel ? "on" : ""}`} onClick={() => select(q.i, true)} aria-pressed={q.i === sel}>
      <small>Surabaya →</small><b>{q.name}</b><span>{q.days} Hari</span>
    </button>)}</div>
  </div>;
}
