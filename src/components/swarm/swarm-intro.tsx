import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Homepage "Swarm Rebuild" intro: hides the real elements, rebuilds them from particles, then gets out of the way. */
export function SwarmIntro({ root }: { root: RefObject<HTMLElement | null> }) {
  const overlay = useRef<HTMLDivElement>(null), [done, setDone] = useState(false);
  useLayoutEffect(() => {
    const el = root.current, ov = overlay.current; if (!el || !ov) return;
    const force = new URLSearchParams(location.search).has("swarm");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || (!force && sessionStorage.getItem("mr-swarm")) || scrollY > 40) { setDone(true); return; }
    el.classList.add("sw-active");
    let stop: (() => void) | undefined, cancelled = false;
    const finish = () => { sessionStorage.setItem("mr-swarm", "1"); el.classList.remove("sw-active"); setDone(true); };
    // hide targets synchronously so nothing flashes before the particles arrive
    el.querySelectorAll(".j-nav .j-logo, .j-nav .j-links, .j-nav .j-btn-sm, .j-nav .j-burger, .j-hero, .j-backdrop, .j-cue, .j-hud").forEach(n => n.setAttribute("data-sw", "wait"));
    const go = () => import("./swarm-engine").then(({ mountSwarm }) => { if (!cancelled) stop = mountSwarm(el, ov, finish).stop; })
      .catch(() => { el.querySelectorAll("[data-sw]").forEach(n => n.removeAttribute("data-sw")); finish(); });
    // wait for fonts so text targets match the real glyphs
    const fontWait = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 900))]);
    fontWait.then(() => requestAnimationFrame(() => go()));
    return () => { cancelled = true; stop?.(); el.classList.remove("sw-active"); el.querySelectorAll("[data-sw]").forEach(n => n.removeAttribute("data-sw")); };
  }, [root]);
  if (done) return null;
  return <div ref={overlay} className="sw-overlay" aria-hidden="true">
    <div className="sw-grid" />
    <div className="sw-hud"><span data-sw-stage>01 · Digital Initialization</span><span data-sw-coord>X 0000 · Y 0000</span></div>
  </div>;
}
