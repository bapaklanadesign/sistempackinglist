import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Animasi angka 0 -> target selama `duration` ms (ease-out), lalu berulang terus.
 * Murni visual — tidak mengubah data; nilai akhir selalu sama dengan target.
 */
export function useCountUp(target: number, duration = 5000): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(p >= 1 ? target : target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { start = 0; raf = requestAnimationFrame(tick); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/** Angka yang dianimasikan dari 0 ke nilai aslinya, berulang tiap 5 detik. */
export function AnimNum({ value, format }: { value: number; format: (n: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

/** Key yang bertambah tiap `ms` — dipakai untuk me-restart animasi gambar grafik. */
export function useAnimCycle(ms = 5200): number {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setK((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return k;
}

/** Progress bar yang terisi bertahap dari 0 ke persentase aslinya, berulang tiap 5 detik. */
export function AnimProgress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const v = useCountUp(Math.min(100, Math.max(0, value)));
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}>
      <div className={cn("h-full rounded-full bg-primary", indicatorClassName)} style={{ width: `${v}%` }} />
    </div>
  );
}

// Progress diimpor agar tree-shaking tetap memakai komponen ui yang sama bila dibutuhkan pemanggil.
export { Progress };
