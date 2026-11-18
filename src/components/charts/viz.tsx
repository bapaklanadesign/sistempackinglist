import { useEffect, useId, useMemo, useState, type ReactElement } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PERIODS, formatNumber, shortAxis, type NumberKind, type Period } from "@/lib/chart-logic";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { useReducedMotion, watchVisibility } from "./motion";

export type Series = { key: string; name: string; color: string };
/** Brand chart palette (tokens in styles.css). */
export const VIZ = {
  navy: "var(--viz-navy)", blue: "var(--viz-blue)", cyan: "var(--viz-cyan)", teal: "var(--viz-teal)",
  green: "var(--viz-green)", red: "var(--viz-red)", amber: "var(--viz-amber)", violet: "var(--viz-violet)", slate: "var(--viz-slate)",
};
export const VIZ_PALETTE = [VIZ.blue, VIZ.cyan, VIZ.navy, VIZ.teal, VIZ.violet, VIZ.amber, VIZ.red, VIZ.green];

/** SVG ids must not contain the punctuation React puts in useId values. */
function useSvgId() {
  return "v" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function PeriodTabs<T extends string = Period>({ value, onChange, options = PERIODS as unknown as { id: T; label: string; hint?: string }[], label = "Filter periode" }: {
  value: T; onChange: (v: T) => void; options?: { id: T; label: string; hint?: string }[]; label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="viz-tabs">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} title={o.hint} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

type TipEntry = { name?: string | number; value?: number | string; color?: string; type?: string; dataKey?: string | number; payload?: Record<string, unknown> & { detail?: string; fill?: string; color?: string } };
function VizTooltip({ active, payload, label, format, total, colors }: { active?: boolean; payload?: TipEntry[]; label?: string | number; format: NumberKind; total?: number; colors?: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.type !== "none");
  const title = payload[0]?.payload?.detail ?? label;
  return (
    <div className="viz-tooltip">
      {title != null && <p className="viz-tooltip-title">{String(title)}</p>}
      {items.map((p, i) => {
        const v = Number(p.value ?? 0);
        return (
          <div key={String(p.dataKey ?? i)} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.payload?.color ?? colors?.[String(p.dataKey)] ?? p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <b className="tabular-nums">{formatNumber(format, v)}</b>
            {total ? <span className="w-12 text-right opacity-70">{formatNumber("pct", (v / total) * 100)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function PulseDot(props: { cx?: number; cy?: number; index?: number; color: string; value?: number }) {
  const { cx, cy, index = 0, color } = props;
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
  return (
    <g>
      <circle className="viz-pulse" cx={cx} cy={cy} r={4} fill={color} style={{ animationDelay: `${(index % 6) * 0.3}s` }} />
      <circle cx={cx} cy={cy} r={3.5} fill="var(--card)" stroke={color} strokeWidth={2} />
    </g>
  );
}

/** Line ("line") or filled area ("area") chart with gradient fill, glowing stroke and a light moving along the line. */
export function TrendChart({ data, series, format, variant = "line", height = 240 }: {
  data: Record<string, unknown>[]; series: Series[]; format: NumberKind; variant?: "line" | "area"; height?: number;
}) {
  const id = useSvgId();
  const reduced = useReducedMotion();
  useEffect(watchVisibility, []);
  return (
    <div className="viz-chart" style={{ height, ["--viz-glow" as string]: `url(#${id}-glow)` }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${id}-f-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={variant === "area" ? 0.42 : 0.24} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
            <filter id={`${id}-glow`} x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tickFormatter={shortAxis} tickLine={false} axisLine={false} fontSize={11} width={46} tick={{ fill: "var(--muted-foreground)" }} />
          <Tooltip content={<VizTooltip format={format} />} cursor={{ stroke: "var(--viz-blue)", strokeOpacity: 0.4, strokeWidth: 1.5, strokeDasharray: "4 4" }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={variant === "line" ? 3 : 2.25} fill={`url(#${id}-f-${s.key})`}
              dot={variant === "line" && !reduced ? <PulseDot color={s.color} /> : false}
              activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--card)", fill: s.color }}
              isAnimationActive={!reduced} animationDuration={1100} animationEasing="ease-out" />
          ))}
          {!reduced && series.map((s) => (
            <Area key={`${s.key}-flow`} className="viz-flow" type="monotone" dataKey={s.key} stroke="var(--viz-spark)" strokeWidth={1.6} fill="none" dot={false} activeDot={false} tooltipType="none" legendType="none" isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bars that grow from the bottom with gradient fills; `colorful` gives every bar its own colour. */
export function BarsChart({ data, xKey, series, format, height = 240, colorful = false }: {
  data: Record<string, unknown>[]; xKey: string; series: Series[]; format: NumberKind; height?: number; colorful?: boolean;
}) {
  const id = useSvgId();
  const reduced = useReducedMotion();
  const colors = Object.fromEntries(series.map((s) => [s.key, s.color]));
  const rows = colorful ? data.map((d, i) => ({ ...d, color: VIZ_PALETTE[i % VIZ_PALETTE.length] })) : data;
  const grad = (key: string, color: string) => (
    <linearGradient key={key} id={key} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="100%" stopColor={color} stopOpacity={0.35} />
    </linearGradient>
  );
  return (
    <div className="viz-chart" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 14, right: 10, left: 0, bottom: 0 }} barGap={4} barCategoryGap="24%">
          <defs>
            {series.map((s) => grad(`${id}-b-${s.key}`, s.color))}
            {colorful && VIZ_PALETTE.map((c, i) => grad(`${id}-p-${i}`, c))}
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} interval={0} minTickGap={4} />
          <YAxis tickFormatter={shortAxis} tickLine={false} axisLine={false} fontSize={11} width={46} tick={{ fill: "var(--muted-foreground)" }} />
          <Tooltip content={<VizTooltip format={format} colors={colors} />} cursor={{ fill: "var(--viz-cursor)", radius: 10 } as never} />
          {series.map((s, si) => (
            <Bar key={s.key} className="viz-bar" dataKey={s.key} name={s.name} fill={`url(#${id}-b-${s.key})`} radius={[10, 10, 4, 4]} maxBarSize={44}
              isAnimationActive={!reduced} animationBegin={si * 160} animationDuration={1000} animationEasing="ease-out">
              {colorful && rows.map((_, i) => <Cell key={i} fill={`url(#${id}-p-${i % VIZ_PALETTE.length})`} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type Slice = { name: string; value: number; color: string };

/** Donut that spins in and fills segment by segment; the centre shows the share of the touched (or largest) segment. */
export function DonutChart({ data, format, size = 196, legend = true }: { data: Slice[]; format: NumberKind; size?: number; legend?: boolean }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  useEffect(watchVisibility, []);
  const total = useMemo(() => data.reduce((s, d) => s + Math.max(0, Number(d.value) || 0), 0), [data]);
  const largest = useMemo(() => data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0), [data]);
  const shown = active ?? largest;
  const slice = data[shown];
  const pct = total > 0 && slice ? (slice.value / total) * 100 : 0;
  const nonZero = data.filter((d) => d.value > 0).length;
  const pieData = data.map((d) => ({ ...d, detail: d.name }));
  return (
    <div className="grid min-w-0 gap-4">
      <div className="viz-donut" style={{ width: size, height: size }}>
        <span className="viz-donut-ring" aria-hidden />
        <span className="viz-donut-track" aria-hidden />
        <div className="viz-donut-spin">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="92%" paddingAngle={nonZero > 1 ? 3 : 0} cornerRadius={8} stroke="none"
                startAngle={90} endAngle={-270} isAnimationActive={!reduced} animationDuration={1300} animationEasing="ease-out"
                onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} onClick={(_, i) => setActive(i)}>
                {pieData.map((d, i) => <Cell key={d.name} fill={d.color} className={cn("viz-slice", active !== null && active !== i && "viz-slice-dim")} />)}
              </Pie>
              <Tooltip content={<VizTooltip format={format} total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="viz-donut-center">
          <p className="viz-donut-pct"><AnimatedNumber value={Math.round(pct * 10) / 10} format="pct" /></p>
          <p className="max-w-[7.5rem] truncate text-[11px] font-semibold text-muted-foreground">{total > 0 ? slice?.name : "Belum ada data"}</p>
        </div>
      </div>
      {legend && (
        <ul className="grid min-w-0 gap-1.5 text-xs">
          {data.map((d, i) => (
            <li key={d.name}>
              <button type="button" className={cn("viz-legend-row", shown === i && total > 0 && "viz-legend-active")} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="min-w-0 flex-1 truncate text-left">{d.name}</span>
                <b className="tabular-nums">{formatNumber(format, d.value)}</b>
                <span className="w-12 text-right text-muted-foreground tabular-nums">{formatNumber("pct", total > 0 ? Math.round((d.value / total) * 1000) / 10 : 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Small legend row with a looping total, used above charts. */
export function VizLegendStat({ color, label, value, format }: { color: string; label: string; value: number; format: NumberKind }): ReactElement {
  return (
    <div className="viz-legend-stat">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-extrabold tabular-nums sm:text-base"><AnimatedNumber value={value} format={format} /></p>
      </div>
    </div>
  );
}
