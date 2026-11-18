import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Inbox, Loader2, Minus } from "lucide-react";
import { formatNumber, type NumberKind, type Trend } from "@/lib/chart-logic";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const tones = {
  blue: "viz-tone-blue",
  green: "viz-tone-green",
  red: "viz-tone-red",
  gray: "viz-tone-navy",
  cyan: "viz-tone-cyan",
  navy: "viz-tone-navy",
  violet: "viz-tone-violet",
};

export type StatTrend = Trend & { invert?: boolean; caption?: string };

/** Up/down indicator. `invert` marks metrics where going up is bad (e.g. expenses). */
export function TrendChip({ trend }: { trend: StatTrend }) {
  const { pct, current, invert, caption = "vs bln lalu" } = trend;
  const isNew = pct === null && current !== 0;
  const dir = isNew ? (current > 0 ? 1 : -1) : pct === null || Math.abs(pct) < 0.05 ? 0 : Math.sign(pct);
  const good = dir === 0 ? null : (dir > 0) !== Boolean(invert);
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : Minus;
  const text = isNew ? "Baru" : `${dir > 0 ? "+" : ""}${formatNumber("pct", Math.round((pct ?? 0) * 10) / 10)}`;
  return (
    <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className={cn("viz-trend", good === true && "viz-trend-good", good === false && "viz-trend-bad")}><Icon className="h-3 w-3" />{text}</span>
      <span className="truncate">{caption}</span>
    </p>
  );
}

export function StatCard({ icon: Icon, label, value, format = "int", tone, trend, compact, index = 0 }: {
  icon: LucideIcon; label: string; value: number | string; format?: NumberKind; tone: keyof typeof tones; trend?: StatTrend | undefined; compact?: boolean; index?: number;
}) {
  return (
    <div className={cn("viz-stat dash-reveal", tones[tone], compact && "viz-stat-compact")} style={{ animationDelay: `${index * 70}ms` }}>
      <span className="viz-stat-glow" aria-hidden />
      <div className="relative flex min-w-0 items-start gap-3">
        <span className="viz-stat-icon"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
          <p className="viz-stat-value">{typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}</p>
          {trend && <TrendChip trend={trend} />}
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string | undefined }) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-3 grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="min-w-0 text-sm font-bold sm:text-base">{title}</h2>
        {action && <div className="min-w-0 max-w-full">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const status = {
  Cocok: "bg-success-soft text-success",
  "Tidak Cocok": "bg-danger-soft text-destructive",
  "Belum Ada": "bg-warning-soft text-warning",
};
export type MatchStatus = keyof typeof status;
export function StatusBadge({ s }: { s: MatchStatus }) {
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold", status[s])}>{s}</span>;
}

export const th = "bg-muted px-3 py-2 text-left text-xs font-semibold whitespace-nowrap";
export const td = "whitespace-nowrap border-t px-3 py-2 text-sm";

/** Renders loading / error / empty states for a query; never substitutes fake data. */
export function QueryState({ isLoading, error, empty, emptyText = "Belum ada data", onRetry, children }: {
  isLoading: boolean; error: unknown; empty?: boolean; emptyText?: string; onRetry?: () => void; children: ReactNode;
}) {
  if (isLoading) return <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat data dari database...</div>;
  if (error)
    return (
      <div role="alert" className="flex flex-col items-center gap-2 rounded-md bg-danger-soft py-8 text-center text-sm text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <p>Gagal memuat data: {error instanceof Error ? error.message : String(error)}</p>
        {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Coba lagi</Button>}
      </div>
    );
  if (empty) return <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground"><Inbox className="h-6 w-6" />{emptyText}</div>;
  return <>{children}</>;
}

export function PeriodFilter({ from, to, onChange }: { from: string; to: string; onChange: (v: { from: string; to: string }) => void }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 text-xs sm:w-auto">
      <Input type="date" aria-label="Dari tanggal" className="h-9 min-w-0 w-full text-xs sm:w-36" value={from} onChange={(e) => onChange({ from: e.target.value, to })} />
      <span>–</span>
      <Input type="date" aria-label="Sampai tanggal" className="h-9 min-w-0 w-full text-xs sm:w-36" value={to} onChange={(e) => onChange({ from, to: e.target.value })} />
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Sebelumnya</Button>
      <span>{page} / {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Berikutnya</Button>
    </div>
  );
}
