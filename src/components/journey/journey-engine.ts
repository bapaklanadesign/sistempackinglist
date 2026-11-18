// Browser-only WebGL2 renderer for the scroll-driven homepage journey. Import dynamically after hydration.
import { frameState, sceneHeights, sceneOf, sceneParams, storyHeight, blockState, STAGE_NAMES } from "@/lib/journey";

const VERT = `#version 300 es
out vec2 v_uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v_uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fragColor;
uniform sampler2D u_t0,u_t1;
uniform vec2 u_resolution,u_mouse,u_pan;
uniform float u_time,u_progress,u_scroll,u_mix,u_aspect,u_zoom,u_intro,
  u_dissolve,u_grain,u_aberr,u_disp,u_vig,u_grade,u_radial,u_blur,u_glow,u_depth;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
vec3 tex(sampler2D t,vec2 q,float lod){
  float m=smoothstep(0.,.08,q.x)*smoothstep(1.,.92,q.x)*step(0.,q.y)*step(q.y,1.);
  vec3 fg=textureLod(t,clamp(q,0.,1.),lod).rgb;
  if(m>=.999)return fg;
  vec3 bg=textureLod(t,vec2(.5+(q.x-.5)*.3,clamp(q.y,0.,1.)),5.).rgb*.55;
  return mix(bg,fg,m);
}
vec3 tri(sampler2D t,vec2 q,vec2 ab,float lod){
  return vec3(tex(t,q+ab,lod).r,tex(t,q,lod).g,tex(t,q-ab,lod).b);
}
void main(){
  float sa=u_resolution.x/u_resolution.y, k=sa/u_aspect;
  vec2 c=v_uv-.5;
  c*=1.+u_radial*dot(c,c);
  c.y+=sin(c.x*5.+u_time*.6)*u_scroll*.004;
  c.x+=sin(c.y*4.-u_time*.5)*u_scroll*.003;
  float zoom=u_zoom*(1.14-.14*u_intro);
  vec2 q=vec2(c.x*k,c.y)/zoom+.5+u_pan;
  float n=fbm(v_uv*3.+u_time*.04), n2=fbm(v_uv*6.-u_time*.03+3.);
  vec2 dir=vec2(n-.5,n2-.5);
  vec2 dA=dir*u_disp*u_mix, dB=-dir*u_disp*(1.-u_mix);
  float l0=dot(texture(u_t0,clamp(q,0.,1.)).rgb,vec3(.299,.587,.114));
  vec2 par=(u_mouse-.5)*u_depth*(l0-.2);
  vec2 ab=c*u_aberr*vec2(1./k,1.);
  vec3 A=tri(u_t0,q+dA+par,ab,u_blur);
  vec3 B=tri(u_t1,q+dB+par,ab,u_blur);
  float th=u_mix*1.4-.2;
  float w=1.-smoothstep(th-.2,th+.2,n);
  float wm=mix(u_mix,w,.65*u_dissolve);
  vec3 col=mix(A,B,wm);
  col+=vec3(.35,.5,1.)*4.*w*(1.-w)*u_glow*sin(3.14159*u_mix)*u_dissolve;
  vec3 gl=textureLod(u_t0,clamp(q,0.,1.),4.5).rgb*(1.-u_mix)+textureLod(u_t1,clamp(q,0.,1.),4.5).rgb*u_mix;
  col+=gl*gl*u_glow;
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(col,col*col*(3.-2.*col),u_grade*.6);
  col=mix(col,col*mix(vec3(.92,.96,1.12),vec3(1.06,1.,.96),smoothstep(.1,.8,lum)),u_grade);
  col=mix(vec3(lum),col,1.+u_grade*.25);
  col*=1.-u_vig*smoothstep(.25,.85,length(c*1.25));
  col+=(h(gl_FragCoord.xy+fract(u_time)*113.)-.5)*u_grain*(1.-lum*.6);
  col*=1.-smoothstep(u_intro*1.4-.4,u_intro*1.4,length(c));
  fragColor=vec4(max(col,0.),1.);
}`;

type Entry = { im: HTMLImageElement; ok: boolean; p: Promise<HTMLImageElement | null> };

/** Images plus a bounded sliding window of GPU textures so 96 frames never fill VRAM. */
class FrameStore {
  imgs: Array<Entry | undefined>;
  tex = new Map<number, WebGLTexture>();
  gl: WebGL2RenderingContext | null = null;
  timer = 0;
  constructor(public urls: string[], public cap = 14) { this.imgs = new Array(urls.length); }
  load(i: number) {
    const existing = this.imgs[i];
    if (existing) return existing.p;
    const im = new Image(); im.decoding = "async";
    const entry: Entry = { im, ok: false, p: Promise.resolve(null) };
    entry.p = new Promise(res => { im.onload = () => { entry.ok = true; res(im); }; im.onerror = () => res(null); });
    im.src = this.urls[i] ?? ""; this.imgs[i] = entry; return entry.p;
  }
  async preload(first = 6) {
    await Promise.all(Array.from({ length: first }, (_, i) => this.load(i)));
    let i = first;
    const tick = () => { for (let k = 0; k < 6 && i < this.urls.length; k++) this.load(i++); if (i < this.urls.length) this.timer = window.setTimeout(tick, 120); };
    tick();
  }
  attach(gl: WebGL2RenderingContext) { this.gl = gl; this.tex.clear(); }
  upload(i: number) {
    const e = this.imgs[i], gl = this.gl;
    if (!e || !e.ok || !gl) return null;
    const t = gl.createTexture(); if (!t) return null;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.im);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex.set(i, t); return t;
  }
  /** Texture for frame i; falls back to the nearest frame already on the GPU. */
  get(i: number): WebGLTexture | null {
    let t = this.tex.get(i) ?? this.upload(i);
    for (let d = 1; !t && d < 12; d++) t = this.tex.get(i - d) ?? this.tex.get(i + d) ?? null;
    return t;
  }
  /** Upload one frame ahead of the scroll direction per tick and drop the farthest texture. */
  warm(c: number, dir: number) {
    const n = c + (dir >= 0 ? 3 : -3);
    if (n >= 0 && n < this.urls.length && !this.tex.has(n)) this.upload(n);
    if (this.tex.size > this.cap && this.gl) {
      let far = -1, fd = -1;
      for (const k of this.tex.keys()) { const d = Math.abs(k - c); if (d > fd) { fd = d; far = k; } }
      this.gl.deleteTexture(this.tex.get(far)!); this.tex.delete(far);
    }
  }
  dispose() { clearTimeout(this.timer); if (this.gl) this.tex.forEach(t => this.gl!.deleteTexture(t)); this.tex.clear(); this.imgs.forEach(e => { if (e) { e.im.onload = null; e.im.onerror = null; } }); }
}

class Renderer {
  gl: WebGL2RenderingContext;
  lost = false;
  locs = new Map<string, WebGLUniformLocation | null>();
  program: WebGLProgram | null = null;
  vao: WebGLVertexArrayObject | null = null;
  constructor(public canvas: HTMLCanvasElement, public store: FrameStore, onLost: () => void, onRestored: () => void) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; onLost(); });
    canvas.addEventListener("webglcontextrestored", () => { this.init(); this.lost = false; onRestored(); });
    this.init();
  }
  init() {
    const { gl } = this;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = this.program = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    this.vao = gl.createVertexArray();
    gl.useProgram(p); this.locs.clear();
    gl.uniform1i(gl.getUniformLocation(p, "u_t0"), 0); gl.uniform1i(gl.getUniformLocation(p, "u_t1"), 1);
    this.set("u_aspect", 576 / 1024);
    this.store.attach(gl);
  }
  set(name: string, v: number | number[]) {
    const { gl } = this;
    if (!this.locs.has(name)) this.locs.set(name, gl.getUniformLocation(this.program!, name));
    const l = this.locs.get(name); if (!l) return;
    if (typeof v === "number") gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2f(l, v[0] ?? 0, v[1] ?? 0);
  }
  resize(maxDpr: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
    this.canvas.width = w; this.canvas.height = h;
    this.gl.viewport(0, 0, w, h); this.set("u_resolution", [w, h]);
  }
  render(i0: number, i1: number, uniforms: Record<string, number | number[]>, dir: number) {
    if (this.lost) return;
    const { gl } = this, a = this.store.get(i0), b = this.store.get(i1);
    if (!a || !b) return;
    this.store.warm(i0, dir);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b);
    for (const [k, v] of Object.entries(uniforms)) this.set("u_" + k, v);
    gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose() { this.gl.getExtension("WEBGL_lose_context")?.loseContext(); }
}

export type JourneyOptions = {
  root: HTMLElement; story: HTMLElement; canvas: HTMLCanvasElement; fallback: HTMLImageElement;
  hudBar: HTMLElement | null; hudNum: HTMLElement | null; frames: string[]; onReady: () => void;
};

export function mountJourney(o: JourneyOptions) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scenes = Array.from(o.story.querySelectorAll<HTMLElement>("[data-scene]"));
  const blocks = scenes.map(s => Array.from(s.querySelectorAll<HTMLElement>("[data-win]")).map(el => ({ el, win: (el.dataset["win"] ?? "0,0,1,1").split(",").map(Number) })));
  const store = new FrameStore(o.frames, innerWidth < 900 ? 10 : 14);
  const maxDpr = () => (innerWidth < 900 ? 1.5 : 2);
  let storyH = 1;
  const layout = () => { storyH = storyHeight(innerWidth); sceneHeights(storyH).forEach((h, i) => { if (scenes[i]) scenes[i].style.height = h + "px"; }); };
  layout();
  const range = () => Math.max(1, storyH - innerHeight);
  const top = () => o.story.offsetTop;

  let renderer: Renderer | null = null;
  try {
    renderer = new Renderer(o.canvas, store, () => o.canvas.classList.add("is-lost"), () => { renderer?.resize(maxDpr()); o.canvas.classList.remove("is-lost"); });
    o.root.dataset["gl"] = "on";
  } catch { o.root.dataset["gl"] = "off"; }

  const mouse: [number, number] = [.5, .5], mTarget: [number, number] = [.5, .5];
  const onMove = (e: PointerEvent) => { mTarget[0] = e.clientX / innerWidth; mTarget[1] = 1 - e.clientY / innerHeight; };
  const onResize = () => { layout(); renderer?.resize(maxDpr()); };
  addEventListener("pointermove", onMove); addEventListener("resize", onResize);

  let value = 0, vel = 0, t0 = performance.now(), last = t0, intro = reduced ? 1 : 0, prevF = 0, raf = 0, started = false, disposed = false;
  const step = (now: number) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const target = Math.min(1, Math.max(0, (scrollY - top()) / range()));
    const prev = value;
    value = reduced ? target : value + (target - value) * (1 - Math.exp(-dt * 7));
    const v = (value - prev) / Math.max(dt, 1e-3) * range() / 4000;
    vel += (Math.max(-3, Math.min(3, v)) - vel) * (1 - Math.exp(-dt * 8));
    const p = value, time = reduced ? 0 : (now - t0) / 1000;
    intro = Math.min(1, intro + dt / 2.8); const ie = 1 - (1 - intro) ** 3;
    const k = 1 - Math.exp(-dt * 4); mouse[0] += (mTarget[0] - mouse[0]) * k; mouse[1] += (mTarget[1] - mouse[1]) * k;
    const { f, i0, i1, mix } = frameState(p, o.frames.length), { i, local } = sceneOf(p);
    const pulse = reduced ? 0 : Math.min(1, Math.abs(vel) / 1.5);
    const hidden = scrollY > top() + storyH + innerHeight;
    if (renderer && !hidden) {
      const sp = sceneParams(p, pulse);
      renderer.render(i0, i1, { ...sp, grain: sp.grain * (reduced ? .5 : 1), dissolve: 0, time, progress: p, mix,
        scroll: reduced ? 0 : vel, mouse: reduced ? [.5, .5] : mouse, intro: ie }, f - prevF);
    } else if (!renderer) {
      const u = o.frames[Math.round(f)];
      if (u && o.fallback.dataset["u"] !== u) { o.fallback.dataset["u"] = u; o.fallback.src = u; }
    }
    prevF = f;
    blocks.forEach((list, si) => list.forEach(({ el, win }) => {
      const l = si === i ? local : si < i ? 5 : -5;
      const { opacity, offset } = blockState(win, l);
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate3d(0,${offset.toFixed(1)}px,0)`;
      el.style.visibility = opacity < .01 ? "hidden" : "visible";
      el.style.pointerEvents = opacity > .6 ? "auto" : "none";
    }));
    o.hudBar?.style.setProperty("--p", p.toFixed(4));
    if (o.hudBar?.parentElement) o.hudBar.parentElement.style.opacity = hidden ? "0" : "1";
    if (o.hudNum) o.hudNum.textContent = `0${i + 1} · ${STAGE_NAMES[i]}`;
  };
  const frame = (now: number) => { if (disposed) return; try { step(now); } catch (e) { console.error("journey frame", e); } raf = requestAnimationFrame(frame); };
  const go = () => {
    if (started || disposed) return; started = true;
    renderer?.resize(maxDpr());
    value = Math.min(1, Math.max(0, (scrollY - top()) / range()));
    o.onReady();
    last = t0 = performance.now(); raf = requestAnimationFrame(frame);
  };
  store.preload(6).then(go).catch(go);
  const safety = window.setTimeout(go, 6000);

  return () => {
    disposed = true; cancelAnimationFrame(raf); clearTimeout(safety);
    removeEventListener("pointermove", onMove); removeEventListener("resize", onResize);
    store.dispose(); renderer?.dispose();
    scenes.forEach(s => (s.style.height = ""));
  };
}
