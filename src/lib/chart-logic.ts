// Pure chart helpers: period buckets, trends, number formats and the looping counter curve.
// Everything here only shapes rows already read from the database for display; nothing is written back.
import { rupiah } from "./format";
import { fmtNum } from "./packing-logic";

export type Period = "day" | "week" | "month" | "year";
export const PERIODS: { id: Period; label: string; hint: string }[] = [
  { id: "day", label: "Hari", hint: "14 hari terakhir" },
  { id: "week", label: "Minggu", hint: "12 minggu terakhir" },
  { id: "month", label: "Bulan", hint: "12 bulan terakhir" },
  { id: "year", label: "Tahun", hint: "5 tahun terakhir" },
];
const COUNT: Record<Period, number> = { day: 14, week: 12, month: 12, year: 5 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY = 86_400_000;

const parse = (date: string) => {
  const [y = 1970, m = 1, d = 1] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const dayMonth = (t: number) => { const d = new Date(t); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const yearOf = (t: number) => new Date(t).getUTCFullYear();
const mondayOf = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;

/** Bucket key a date (YYYY-MM-DD) falls in; weeks start on Monday. */
export function bucketKey(period: Period, date: string) {
  if (period === "day") return date.slice(0, 10);
  if (period === "week") return iso(mondayOf(parse(date)));
  if (period === "month") return date.slice(0, 7);
  return date.slice(0, 4);
}

export type Bucket = { key: string; label: string; detail: string; from: string; to: string };

/** Oldest-first buckets ending at `today`: 14 days, 12 weeks, 12 months or 5 years. */
export function periodBuckets(period: Period, today: string): Bucket[] {
  const t = parse(today);
  const out: Bucket[] = [];
  for (let i = COUNT[period] - 1; i >= 0; i--) {
    if (period === "day") {
      const d = t - i * DAY;
      out.push({ key: iso(d), label: dayMonth(d), detail: `${dayMonth(d)} ${yearOf(d)}`, from: iso(d), to: iso(d) });
    } else if (period === "week") {
      const s = mondayOf(t) - i * 7 * DAY, e = s + 6 * DAY;
      out.push({ key: iso(s), label: dayMonth(s), detail: `${dayMonth(s)} – ${dayMonth(e)} ${yearOf(e)}`, from: iso(s), to: iso(e) });
    } else if (period === "month") {
      const now = new Date(t);
      const s = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
      const e = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0);
      const m = MONTHS[new Date(s).getUTCMonth()] ?? "";
      out.push({ key: iso(s).slice(0, 7), label: m, detail: `${m} ${yearOf(s)}`, from: iso(s), to: iso(e) });
    } else {
      const y = yearOf(t) - i;
      out.push({ key: String(y), label: String(y), detail: `Tahun ${y}`, from: `${y}-01-01`, to: `${y}-12-31` });
    }
  }
  return out;
}

/** First date the chart needs, used as the database query start. */
export const rangeStart = (period: Period, today: string) => periodBuckets(period, today)[0]?.from ?? today;

/** Sums each metric per bucket; rows outside the window are ignored. */
export function seriesBy<T, K extends string>(rows: T[], period: Period, today: string, dateOf: (r: T) => string | null | undefined, metrics: Record<K, (r: T) => number>) {
  const keys = Object.keys(metrics) as K[];
  const map = new Map(periodBuckets(period, today).map((b) => [b.key, { ...b, ...(Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>) }]));
  for (const r of rows) {
    const d = dateOf(r);
    if (!d) continue;
    const b = map.get(bucketKey(period, d));
    if (!b) continue;
    for (const k of keys) (b as Record<K, number>)[k] += Number(metrics[k](r)) || 0;
  }
  const out = [...map.values()];
  for (const b of out) for (const k of keys) (b as Record<K, number>)[k] = Math.round((b as Record<K, number>)[k] * 1e4) / 1e4;
  return out;
}

export type Trend = { current: number; previous: number; pct: number | null };

/** Percent change; null means "new" (nothing before, something now). */
export const changePct = (current: number, previous: number) => (previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current === 0 ? 0 : null);

/** Month-to-date vs the same days of last month (e.g. 1–17 Nov vs 1–17 Okt), so partial months compare fairly. */
export function mtdTrend<T>(rows: T[], dateOf: (r: T) => string | null | undefined, valueOf: (r: T) => number, today: string): Trend {
  const [y = 1970, m = 1, d = 1] = today.split("-").map(Number);
  const curFrom = `${today.slice(0, 7)}-01`;
  const prevLast = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const prevFrom = iso(Date.UTC(y, m - 2, 1));
  const prevTo = iso(Date.UTC(y, m - 2, Math.min(d, prevLast)));
  let current = 0, previous = 0;
  for (const r of rows) {
    const date = dateOf(r)?.slice(0, 10);
    if (!date) continue;
    if (date >= curFrom && date <= today) current += Number(valueOf(r)) || 0;
    else if (date >= prevFrom && date <= prevTo) previous += Number(valueOf(r)) || 0;
  }
  return { current, previous, pct: changePct(current, previous) };
}

/** Balance now vs at the start of the month, given this month's net flow. */
export const balanceTrend = (balance: number, netThisMonth: number): Trend => ({ current: balance, previous: balance - netThisMonth, pct: changePct(balance, balance - netThisMonth) });

export type NumberKind = "rupiah" | "int" | "koli" | "kg" | "m3" | "pct";
const FORMATS: Record<NumberKind, (n: number) => string> = {
  rupiah: (n) => rupiah(n),
  int: (n) => fmtNum(n, 0),
  koli: (n) => fmtNum(n),
  kg: (n) => `${fmtNum(n)} kg`,
  m3: (n) => `${fmtNum(n, 4)} m³`,
  pct: (n) => `${fmtNum(n, 1)}%`,
};
const STEP_DECIMALS: Record<NumberKind, number> = { rupiah: 0, int: 0, koli: 0, kg: 0, m3: 2, pct: 0 };
export const formatNumber = (kind: NumberKind, n: number) => FORMATS[kind](n);

/** Counter text at a point of the animation; the peak always shows the exact database value. */
export function formatAnimated(kind: NumberKind, target: number, progress: number) {
  if (progress >= 1) return FORMATS[kind](target);
  const f = 10 ** STEP_DECIMALS[kind];
  return FORMATS[kind](Math.round(target * Math.max(0, progress) * f) / f);
}

/** Short axis labels: 1,2 M / 12 Jt / 15 Rb. */
export function shortAxis(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${fmtNum(n / 1e9, 1)} M`;
  if (a >= 1e6) return `${fmtNum(n / 1e6, 1)} Jt`;
  if (a >= 1e3) return `${fmtNum(n / 1e3, 1)} Rb`;
  return fmtNum(n, 1);
}

/** Looping counter: count up, hold the real value for 10 s, ease back to 0, short rest — 13.1 s per loop. */
export const LOOP = { up: 1800, hold: 10_000, down: 900, rest: 400 } as const;
export const LOOP_MS = LOOP.up + LOOP.hold + LOOP.down + LOOP.rest;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export function loopProgress(elapsedMs: number) {
  const t = ((elapsedMs % LOOP_MS) + LOOP_MS) % LOOP_MS;
  if (t < LOOP.up) return easeOutCubic(t / LOOP.up);
  if (t < LOOP.up + LOOP.hold) return 1;
  if (t < LOOP.up + LOOP.hold + LOOP.down) return 1 - easeInOutCubic((t - LOOP.up - LOOP.hold) / LOOP.down);
  return 0;
}
