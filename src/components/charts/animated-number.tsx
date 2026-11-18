import { useEffect, useRef } from "react";
import { formatAnimated, formatNumber, loopProgress, type NumberKind } from "@/lib/chart-logic";
import { subscribeTick, useReducedMotion } from "./motion";

/**
 * Looping counter 0 → value → 0. Writes text straight to the element (no React re-render per frame),
 * runs only while on screen and the tab is visible, and shows the plain value for reduced motion and SSR.
 * Screen readers always get the exact value.
 */
export function AnimatedNumber({ value, format, className }: { value: number; format: NumberKind; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const exact = formatNumber(format, value);
    el.textContent = exact;
    if (reduced || typeof IntersectionObserver === "undefined") return;
    let unsub: (() => void) | null = null;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      el.textContent = formatAnimated(format, value, loopProgress(now - t0));
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && !unsub) { t0 = 0; unsub = subscribeTick(tick); }
      else if (!e?.isIntersecting && unsub) { unsub(); unsub = null; el.textContent = exact; }
    });
    io.observe(el);
    return () => { io.disconnect(); unsub?.(); };
  }, [value, format, reduced]);
  return (
    <>
      <span ref={ref} aria-hidden className={className}>{formatNumber(format, value)}</span>
      <span className="sr-only">{formatNumber(format, value)}</span>
    </>
  );
}
