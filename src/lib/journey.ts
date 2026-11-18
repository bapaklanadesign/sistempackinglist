// Scroll-driven journey timing shared by the homepage engine and tests (pure, SSR-safe).
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const at = <T,>(list: readonly T[], i: number): T => list[Math.min(list.length - 1, Math.max(0, i))] as T;

// 8 stages: Hero, Truck, Crane, Loading, Departure, Routes, Arrival, Identity.
export const RATIOS = [1600, 2200, 2200, 1600, 1900, 2600, 2200, 1700];
const SUM = RATIOS.reduce((a, b) => a + b, 0);
export const BOUNDS = RATIOS.reduce<number[]>((a, r) => (a.push((a.length ? at(a, a.length - 1) : 0) + r / SUM), a), []);
export const STAGE_NAMES = ["Hero", "Truk Tiba", "Crane", "Loading", "Berangkat", "Rute", "Tiba", "Identitas"];
export const FRAME_COUNT = 96;
type Key = readonly [number, number];
// Stage boundary -> frame index from the source footage.
const FRAME_AT = [0, 3, 15, 31, 40, 50, 65, 78];
export const FRAME_KEYS: Key[] = [[0, 0], ...FRAME_AT.slice(1).map((f, i): Key => [at(BOUNDS, i), f]), [1, 95]];

export function storyHeight(viewportWidth: number) {
  return viewportWidth >= 900 ? 16000 : 10500;
}
export function sceneHeights(total: number) {
  return RATIOS.map(r => Math.round((r / SUM) * total));
}

function keyedLinear(keys: readonly Key[], p: number) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, f0] = at(keys, i), [p1, f1] = at(keys, i + 1);
    if (p <= p1) return lerp(f0, f1, (p - p0) / (p1 - p0));
  }
  return at(keys, keys.length - 1)[1];
}

export function frameState(p: number, n = FRAME_COUNT) {
  const f = Math.min(n - 1, Math.max(0, keyedLinear(FRAME_KEYS, p)));
  const i0 = Math.min(n - 2, Math.floor(f));
  return { f, i0, i1: i0 + 1, mix: f - i0 };
}

export function sceneOf(p: number) {
  const found = BOUNDS.findIndex(b => p <= b + 1e-9);
  const i = found < 0 ? 7 : Math.min(7, found);
  const start = i ? at(BOUNDS, i - 1) : 0;
  return { i, local: (p - start) / (at(BOUNDS, i) - start) };
}

/** Opacity and vertical offset for a caption with window [in0, in1, out0, out1] at local stage progress. */
export function blockState(win: readonly number[], local: number) {
  const a = smooth(at(win, 0), at(win, 1), local), b = smooth(at(win, 2), at(win, 3), local);
  return { opacity: a * (1 - b), offset: (1 - a) * 48 - b * 48 };
}

const CFG = {
  grain: [.05, .05, .05, .05, .06, .05, .05, .04], aberr: [.002, .002, .002, .002, .003, .004, .002, .002],
  disp: [.004, .004, .004, .004, .006, .008, .004, .004], vig: [.4, .35, .35, .35, .4, .45, .35, .3],
  grade: [.3, .3, .3, .3, .35, .3, .3, .25], radial: [.05, .05, .05, .05, .06, .06, .05, .04],
  blur: [0, .2, .2, .2, .3, .3, .2, 0], glow: [.1, .08, .08, .08, .1, .14, .08, .06], depth: [.012, .012, .012, .012, .012, .01, .012, .008],
};
type Cfg = keyof typeof CFG;
const ZOOM_AT = [1, 1, 1.03, 1.05, 1.03, 1, 1, 1.03];
const ZOOM: Key[] = [[0, 1], ...ZOOM_AT.slice(1).map((z, i): Key => [at(BOUNDS, i), z]), [1, 1.06]];
function keyedSmooth(keys: readonly Key[], p: number) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, v0] = at(keys, i), [p1, v1] = at(keys, i + 1);
    if (p <= p1) return lerp(v0, v1, smooth(p0, p1, p));
  }
  return at(keys, keys.length - 1)[1];
}
export type SceneParams = Record<Cfg | "zoom", number> & { pan: [number, number] };
export function sceneParams(p: number, pulse: number): SceneParams {
  const v = (k: Cfg) => {
    const list = CFG[k]; let x = at(list, 0);
    for (let i = 0; i < 7; i++) x = lerp(x, at(list, i + 1), smooth(at(BOUNDS, i) - .02, at(BOUNDS, i) + .02, p));
    return x;
  };
  return {
    grain: v("grain"), vig: v("vig"), grade: v("grade"), radial: v("radial"), depth: v("depth"),
    blur: v("blur") * pulse, aberr: v("aberr") + pulse * .004, glow: v("glow") * (.8 + .4 * pulse), disp: v("disp") * (.3 + .7 * pulse),
    zoom: keyedSmooth(ZOOM, p), pan: [Math.sin(p * 14) * .005, 0],
  };
}
