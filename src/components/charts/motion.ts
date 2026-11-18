import { useEffect, useState } from "react";

// One shared animation clock for every counter on the page: a single requestAnimationFrame loop
// that stops when nothing is subscribed or the browser tab is hidden.
type Tick = (now: number) => void;
const subs = new Set<Tick>();
let raf = 0;
let listening = false;

function frame(now: number) {
  subs.forEach((s) => s(now));
  raf = subs.size && !document.hidden ? requestAnimationFrame(frame) : 0;
}
function start() {
  if (!raf && subs.size && !document.hidden) raf = requestAnimationFrame(frame);
}
function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

/** Marks the page paused while hidden so CSS chart loops stop too (see [data-viz-paused] in styles.css). */
export function watchVisibility() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  const sync = () => {
    if (document.hidden) { document.documentElement.setAttribute("data-viz-paused", ""); stop(); }
    else { document.documentElement.removeAttribute("data-viz-paused"); start(); }
  };
  document.addEventListener("visibilitychange", sync);
  sync();
}

export function subscribeTick(tick: Tick) {
  watchVisibility();
  subs.add(tick);
  start();
  return () => {
    subs.delete(tick);
    if (!subs.size) stop();
  };
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}
