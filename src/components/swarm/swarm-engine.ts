import * as THREE from "three";
import { SWARM, SWARM_GROUPS, STAGE_LABELS, particleBudget, revealAt, stageAt, travel, type SwarmGroup } from "@/lib/swarm-timeline";

/** Brand palette (linear-ish RGB 0..1). */
const C = { blue: [0.086, 0.545, 1], cyan: [0, 0.831, 1], orange: [1, 0.447, 0], white: [1, 1, 1] } as const;
type Pt = { x: number; y: number; r: number; g: number; b: number };
type Spec = { group: SwarmGroup; hide: Element[]; sample: Element[] };

const vis = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
const q = (root: ParentNode, s: string) => Array.from(root.querySelectorAll(s)).filter(vis);

/** Which real elements are hidden and rebuilt in each stage. */
function specs(root: HTMLElement): Spec[] {
  const nav = q(root, ".j-nav .j-logo, .j-nav .j-links, .j-nav > .j-btn, .j-nav .j-btn-sm, .j-nav .j-burger");
  const navSample = q(root, ".j-nav .j-logo img, .j-nav .j-logo b, .j-nav .j-links a, .j-nav .j-btn-sm, .j-nav .j-burger");
  const hero = q(root, ".j-hero");
  return [
    { group: "nav", hide: nav, sample: navSample },
    { group: "hero", hide: hero, sample: q(root, ".j-hero .j-eyebrow, .j-hero h1 .j-ln, .j-hero .j-lead, .j-hero .j-btn") },
    { group: "visual", hide: q(root, ".j-backdrop"), sample: q(root, ".j-fallback") },
    { group: "components", hide: q(root, ".j-cue, .j-hud, .j-card"), sample: q(root, ".j-cue, .j-hud, .j-card") },
  ];
}

const off = document.createElement("canvas"), ctx = off.getContext("2d", { willReadFrequently: true })!;

/** Pixel-sample a drawn region into colored target points. */
function scan(w: number, h: number, ox: number, oy: number, step: number, keep: (r: number, g: number, b: number, a: number) => boolean, tint?: readonly number[]): Pt[] {
  const out: Pt[] = []; let d: Uint8ClampedArray;
  try { d = ctx.getImageData(0, 0, w, h).data; } catch { return out; }
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4, a = d[i + 3];
    if (!keep(d[i], d[i + 1], d[i + 2], a)) continue;
    const jx = x + (Math.random() - .5) * step, jy = y + (Math.random() - .5) * step;
    out.push(tint ? { x: ox + jx, y: oy + jy, r: tint[0], g: tint[1], b: tint[2] } : { x: ox + jx, y: oy + jy, r: d[i] / 255, g: d[i + 1] / 255, b: d[i + 2] / 255 });
  }
  return out;
}

/** Text: redraw every word at its real on-screen box with the real font, then sample the glyph pixels. */
function textPoints(el: Element, step: number, tint: readonly number[]): Pt[] {
  const box = el.getBoundingClientRect(), w = Math.ceil(box.width), h = Math.ceil(box.height);
  if (w < 2 || h < 2 || w * h > 4e6) return [];
  off.width = w; off.height = h; ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n: Node | null;
  while ((n = walker.nextNode())) {
    const p = n.parentElement!, cs = getComputedStyle(p); if (cs.visibility === "hidden" || cs.display === "none") continue;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    const upper = cs.textTransform === "uppercase", txt = n.textContent ?? "", re = /\S+/g; let m: RegExpExecArray | null;
    while ((m = re.exec(txt))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rr = r.getBoundingClientRect(); if (!rr.width) continue;
      const fs = parseFloat(cs.fontSize), base = rr.top - box.top + (rr.height + fs * .7) / 2;
      ctx.fillText(upper ? m[0].toUpperCase() : m[0], rr.left - box.left, base, rr.width + 2);
    }
  }
  return scan(w, h, box.left, box.top, step, (_r, _g, _b, a) => a > 110, tint);
}

/** Box outline (buttons, cards): points along the rounded border plus a light fill. */
function boxPoints(el: Element, step: number, tint: readonly number[]): Pt[] {
  const b = el.getBoundingClientRect(), out: Pt[] = [], per = 2 * (b.width + b.height), n = Math.round(per / (step * .8));
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per, x: number, y: number;
    if (d < b.width) { x = b.left + d; y = b.top; } else if ((d -= b.width) < b.height) { x = b.right; y = b.top + d; }
    else if ((d -= b.height) < b.width) { x = b.right - d; y = b.bottom; } else { x = b.left; y = b.bottom - (d - b.width); }
    out.push({ x, y, r: tint[0], g: tint[1], b: tint[2] });
  }
  const fill = Math.round((b.width * b.height) / (step * step * 18));
  for (let i = 0; i < fill; i++) out.push({ x: b.left + Math.random() * b.width, y: b.top + Math.random() * b.height, r: tint[0] * .7, g: tint[1] * .7, b: tint[2] * .9 });
  return out;
}

/** Image (real logo / real port footage): load a CORS-clean copy, draw it like object-fit:cover, sample as a point cloud. */
async function imagePoints(img: HTMLImageElement, step: number): Promise<Pt[]> {
  const b = img.getBoundingClientRect(), w = Math.ceil(b.width), h = Math.ceil(b.height);
  const src = new Image(); src.crossOrigin = "anonymous"; src.src = img.currentSrc || img.src;
  try { await src.decode(); } catch { return []; }
  off.width = w; off.height = h; ctx.clearRect(0, 0, w, h);
  const s = Math.max(w / src.naturalWidth, h / src.naturalHeight), dw = src.naturalWidth * s, dh = src.naturalHeight * s;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return scan(w, h, b.left, b.top, step, (r, g, bl, a) => a > 120 && r + g + bl > 60);
}

async function targets(spec: Spec, area: number, budget: number): Promise<Pt[]> {
  const step = Math.max(2, Math.sqrt(area / budget) * .55);
  const all: Pt[][] = await Promise.all(spec.sample.map(async el => {
    if (el instanceof HTMLImageElement) return imagePoints(el, spec.group === "visual" ? step * 2.6 : Math.max(1.5, step * .5));
    if (el.matches(".j-btn, .j-card, .j-burger")) return [...boxPoints(el, step, el.matches(".j-btn:not(.j-btn-ghost)") ? C.orange : C.blue), ...textPoints(el, step, C.white)];
    return textPoints(el, step, el.matches(".j-eyebrow") ? C.orange : el.closest("em") || el.querySelector("em") ? C.cyan : C.white);
  }));
  return all.flat();
}

export type SwarmHandle = { stop: () => void };

/** Mount the Swarm Rebuild overlay on top of the homepage. Returns a disposer. */
export function mountSwarm(root: HTMLElement, overlay: HTMLElement, onDone: () => void): SwarmHandle {
  let raf = 0, disposed = false, finishing = -1;
  const specList = specs(root);
  specList.forEach(s => s.hide.forEach(el => el.setAttribute("data-sw", "wait")));
  const reveal = (g: SwarmGroup) => specList.find(s => s.group === g)?.hide.forEach(el => {
    el.setAttribute("data-sw", "in"); setTimeout(() => el.getAttribute("data-sw") === "in" && el.removeAttribute("data-sw"), 900);
  });
  const revealAll = () => SWARM_GROUPS.forEach(reveal);

  let renderer: THREE.WebGLRenderer | null = null;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" }); } catch { renderer = null; }
  const hud = overlay.querySelector<HTMLElement>("[data-sw-stage]"), coord = overlay.querySelector<HTMLElement>("[data-sw-coord]");

  // Light version: no WebGL → staged fades only.
  if (!renderer) {
    const timers = SWARM_GROUPS.map(g => setTimeout(() => reveal(g), revealAt(g) * .5));
    const end = setTimeout(() => { overlay.remove(); onDone(); }, SWARM.final * .5);
    return { stop: () => { timers.forEach(clearTimeout); clearTimeout(end); revealAll(); } };
  }

  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
  overlay.prepend(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, W, 0, -H, -1, 1);
  const N = particleBudget(W, navigator.hardwareConcurrency || 8);

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), tx = new Float32Array(N), ty = new Float32Array(N);
  const grp = new Int8Array(N).fill(-1), delay = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // spawn from every edge so the swarm "arrives" from all directions
    const side = i % 4, u = Math.random();
    const x = side === 0 ? -20 : side === 1 ? W + 20 : u * W, y = side === 2 ? -20 : side === 3 ? H + 20 : u * H;
    pos[i * 3] = x; pos[i * 3 + 1] = -y; seed[i] = Math.random() * 1000;
    const a = Math.atan2(H / 2 - y, W / 2 - x); vx[i] = Math.cos(a) * (2 + Math.random() * 3); vy[i] = Math.sin(a) * (2 + Math.random() * 3);
    const c = Math.random() < .28 ? C.orange : Math.random() < .5 ? C.cyan : C.blue;
    col.set(c, i * 3); size[i] = 1.4 + Math.random() * 2.2; alpha[i] = 0; tx[i] = NaN; delay[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1)); geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uDpr: { value: dpr } },
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uDpr;
      void main(){ vC=color; vA=alpha; gl_PointSize=size*uDpr*2.2; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard;
      float core=smoothstep(.22,.0,d), glow=smoothstep(.5,.0,d)*.45; gl_FragColor=vec4(vC*(core+glow), (core+glow)*vA); }`,
  });
  scene.add(new THREE.Points(geo, mat));

  // digital connection lines between the first "lead" particles
  const L = Math.min(260, N), MAXSEG = 700, lpos = new Float32Array(MAXSEG * 6);
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
  const lmat = new THREE.LineBasicMaterial({ color: 0x168bff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.LineSegments(lgeo, lmat));

  // assign target points to particles, stage by stage (nav gets dense coverage first)
  const area = W * H;
  Promise.all(specList.map(s => targets(s, area, N))).then(lists => {
    if (disposed) return;
    const total = lists.reduce((a, l) => a + l.length, 0) || 1, usable = Math.round(N * .92);
    let k = 0;
    lists.forEach((pts, gi) => {
      const share = Math.min(pts.length, Math.round((pts.length / total) * usable) || 0);
      for (let j = 0; j < share && k < N; j++, k++) {
        const p = pts[Math.floor((j / share) * pts.length)];
        tx[k] = p.x; ty[k] = -p.y; grp[k] = SWARM_GROUPS.indexOf(specList[gi].group);
        col[k * 3] = p.r; col[k * 3 + 1] = p.g; col[k * 3 + 2] = p.b;
      }
    });
    geo.attributes.color.needsUpdate = true;
  });

  const t0 = performance.now(); let last = t0, hudT = 0, revealed = 0;
  const cx = W / 2, cy = -H / 2;
  const finish = () => { if (finishing < 0) { finishing = performance.now(); revealAll(); } };
  addEventListener("wheel", finish, { passive: true }); addEventListener("touchmove", finish, { passive: true });
  addEventListener("keydown", finish); addEventListener("resize", finish);

  const frame = (now: number) => {
    if (disposed) return;
    const t = now - t0, dt = Math.min((now - last) / 16.67, 3); last = now;
    const fadeOut = finishing >= 0 ? Math.min(1, (now - finishing) / 700) : Math.max(0, (t - SWARM.final) / (SWARM.end - SWARM.final));
    // reveal real elements as their particles land
    SWARM_GROUPS.forEach((g, i) => { if (!(revealed & (1 << i)) && t >= revealAt(g)) { revealed |= 1 << i; reveal(g); } });
    const scx = cx + Math.sin(t * .0007) * W * .22, scy = cy + Math.cos(t * .0009) * H * .18;
    for (let i = 0; i < N; i++) {
      const o = i * 3; let x = pos[o], y = pos[o + 1];
      // swarm: alignment via shared flow field, cohesion to moving centroid, separation from the core
      const s = seed[i], ang = Math.sin(x * .004 + t * .0006 + s) * 2 + Math.cos(y * .005 - t * .0005) * 2;
      const dx = scx - x, dy = scy - y, dist = Math.hypot(dx, dy) + 1;
      let ax = Math.cos(ang) * .18 + (dx / dist) * .12, ay = Math.sin(ang) * .18 + (dy / dist) * .12;
      if (dist < 90) { ax -= (dx / dist) * .35; ay -= (dy / dist) * .35; }
      const g = grp[i]; let k = 0;
      if (g >= 0 && !Number.isNaN(tx[i])) k = travel(t, SWARM_GROUPS[g], delay[i]);
      if (k > 0) {
        // attraction to the element's target point, swarm forces fade out as it settles
        ax = ax * (1 - k) + (tx[i] - x) * .02 * k; ay = ay * (1 - k) + (ty[i] - y) * .02 * k;
        vx[i] = (vx[i] + ax * dt) * (1 - .14 * k); vy[i] = (vy[i] + ay * dt) * (1 - .14 * k);
        x += vx[i] * dt; y += vy[i] * dt;
        if (k > .9) { const m = (k - .9) * 10; x += (tx[i] - x) * m * .5; y += (ty[i] - y) * m * .5; }
      } else {
        vx[i] = (vx[i] + ax * dt) * .985; vy[i] = (vy[i] + ay * dt) * .985; x += vx[i] * dt; y += vy[i] * dt;
      }
      pos[o] = x; pos[o + 1] = y;
      const landed = g >= 0 && t > revealAt(SWARM_GROUPS[g]) ? Math.max(.25, 1 - (t - revealAt(SWARM_GROUPS[g])) / 1800) : 1;
      const born = Math.min(1, t / (300 + (i % 50) * 18));
      const ambient = g < 0 && t > SWARM.start.components ? Math.max(0, 1 - (t - SWARM.start.components) / 1500) : 1;
      // motion blur stand-in: fast particles glow larger and softer
      size[i] = (1.4 + (s % 2.2)) * (1 + Math.min(1.2, Math.hypot(vx[i], vy[i]) * .08));
      alpha[i] = born * landed * ambient * (1 - fadeOut) * .9;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;

    // connection lines (Stage 1–2), O(L²) on a small lead set only
    let seg = 0; const lineOn = Math.max(0, Math.min(1, t / 500) * (1 - Math.max(0, (t - SWARM.start.hero) / 1200))) * (1 - fadeOut);
    if (lineOn > 0) for (let a = 0; a < L && seg < MAXSEG; a++) for (let b = a + 1; b < L && seg < MAXSEG; b++) {
      const ddx = pos[a * 3] - pos[b * 3], ddy = pos[a * 3 + 1] - pos[b * 3 + 1];
      if (ddx * ddx + ddy * ddy < 6400) { lpos.set([pos[a * 3], pos[a * 3 + 1], 0, pos[b * 3], pos[b * 3 + 1], 0], seg * 6); seg++; }
    }
    lgeo.setDrawRange(0, seg * 2); lgeo.attributes.position.needsUpdate = true; lmat.opacity = .35 * lineOn;

    if (now - hudT > 90) {
      hudT = now; const st = finishing >= 0 ? 5 : stageAt(t);
      if (hud) hud.textContent = STAGE_LABELS[st];
      if (coord) coord.textContent = `X ${String(Math.round(pos[0])).padStart(4, "0")} · Y ${String(Math.round(-pos[1])).padStart(4, "0")} · ${N} PTS`;
      overlay.style.setProperty("--sw-grid", String(Math.max(0, 1 - t / SWARM.start.visual) * (1 - fadeOut)));
    }
    overlay.style.opacity = String(1 - fadeOut);
    renderer!.render(scene, cam);
    if (fadeOut >= 1) { stop(); onDone(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  function stop() {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf);
    removeEventListener("wheel", finish); removeEventListener("touchmove", finish); removeEventListener("keydown", finish); removeEventListener("resize", finish);
    revealAll(); geo.dispose(); mat.dispose(); lgeo.dispose(); lmat.dispose();
    renderer!.dispose(); renderer!.forceContextLoss(); renderer!.domElement.remove();
  }
  return { stop };
}
