import { describe, expect, it } from "vitest";
import { LOOP, LOOP_MS, balanceTrend, bucketKey, changePct, formatAnimated, loopProgress, mtdTrend, periodBuckets, rangeStart, seriesBy } from "@/lib/chart-logic";
import { destinationTotals } from "@/lib/packing-logic";

describe("period filter (hari, minggu, bulan, tahun)", () => {
  it("covers 14 days, 12 weeks, 12 months and 5 years ending today", () => {
    expect(periodBuckets("day", "2026-11-17").map((b) => b.key).slice(-2)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(periodBuckets("day", "2026-11-17")).toHaveLength(14);
    expect(periodBuckets("week", "2026-11-17")).toHaveLength(12);
    expect(periodBuckets("month", "2026-11-17").map((b) => b.key)[0]).toBe("2025-12");
    expect(periodBuckets("year", "2026-11-17").map((b) => b.key)).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(rangeStart("month", "2026-11-17")).toBe("2025-12-01");
  });
  it("weeks start on Monday", () => {
    expect(bucketKey("week", "2026-11-17")).toBe("2026-11-16"); // Tuesday → Monday
    expect(bucketKey("week", "2026-11-22")).toBe("2026-11-16"); // Sunday stays in the same week
    expect(periodBuckets("week", "2026-11-17").at(-1)?.detail).toBe("16 Nov – 22 Nov 2026");
  });
  it("sums real rows per bucket and ignores rows outside the window", () => {
    const rows = [{ d: "2026-11-02", a: 100 }, { d: "2026-11-30", a: 50 }, { d: "2026-10-05", a: 7 }, { d: "2020-01-01", a: 999 }];
    const s = seriesBy(rows, "month", "2026-11-17", (r) => r.d, { total: (r) => r.a });
    expect(s.find((b) => b.key === "2026-11")?.total).toBe(150);
    expect(s.find((b) => b.key === "2026-10")?.total).toBe(7);
    expect(s.reduce((t, b) => t + b.total, 0)).toBe(157);
  });
});

describe("trend up/down", () => {
  it("compares this month so far with the same days of last month", () => {
    const rows = [{ d: "2026-11-05", v: 300 }, { d: "2026-10-10", v: 200 }, { d: "2026-10-25", v: 1000 }];
    expect(mtdTrend(rows, (r) => r.d, (r) => r.v, "2026-11-17")).toEqual({ current: 300, previous: 200, pct: 50 });
  });
  it("clamps to the last day of a shorter previous month", () => {
    const rows = [{ d: "2026-02-28", v: 10 }, { d: "2026-03-31", v: 20 }];
    expect(mtdTrend(rows, (r) => r.d, (r) => r.v, "2026-03-31")).toEqual({ current: 20, previous: 10, pct: 100 });
  });
  it("reports new data, no change and drops", () => {
    expect(changePct(5, 0)).toBeNull();
    expect(changePct(0, 0)).toBe(0);
    expect(changePct(50, 100)).toBe(-50);
    expect(balanceTrend(1_200_000, 200_000)).toEqual({ current: 1_200_000, previous: 1_000_000, pct: 20 });
  });
});

describe("looping counter 0 → value → 0", () => {
  it("holds the exact value for 10 seconds, then counts back down and rests", () => {
    expect(LOOP.hold).toBe(10_000);
    expect(LOOP_MS).toBe(13_100);
    expect(loopProgress(1800 + 5_000)).toBe(1);
    expect(loopProgress(1800 + 10_000 - 1)).toBe(1);
    expect(loopProgress(1800 + 10_000 + 450)).toBe(0.5);
    expect(loopProgress(LOOP_MS - 1)).toBe(0);
  });
  it("starts at 0, reaches the value, returns to 0 and repeats", () => {
    expect(loopProgress(0)).toBe(0);
    expect(loopProgress(1800)).toBe(1);
    expect(loopProgress(2500)).toBe(1);
    expect(loopProgress(LOOP_MS - 1)).toBe(0);
    expect(loopProgress(LOOP_MS + 1800)).toBe(1);
    expect(loopProgress(900)).toBeGreaterThan(0);
    expect(loopProgress(900)).toBeLessThan(1);
  });
  it("shows the exact Rupiah, kg, koli and m³ value at the peak", () => {
    expect(formatAnimated("rupiah", 1500000.5, 1)).toBe("Rp 1.500.000,5");
    expect(formatAnimated("kg", 205.25, 1)).toBe("205,25 kg");
    expect(formatAnimated("koli", 12, 1)).toBe("12");
    expect(formatAnimated("m3", 1.4, 1)).toBe("1,4 m³");
    expect(formatAnimated("rupiah", 1000, 0)).toBe("Rp 0");
    expect(formatAnimated("rupiah", 1000, 0.5)).toBe("Rp 500");
  });
});

describe("top destination ports", () => {
  it("adds koli per destination, largest first, without cancelled Packing Lists", () => {
    const base = { item_count: 1, total_weight_kg: 1, total_volume_m3: 0.1, etd: null, vessel_id: null, voyage_no: null };
    const rows = [
      { ...base, id: "1", status: "draft" as const, total_koli: 5, destination: { name: "Ambon" } },
      { ...base, id: "2", status: "tiba" as const, total_koli: 20, destination: { name: "Sorong" } },
      { ...base, id: "3", status: "dibatalkan" as const, total_koli: 99, destination: { name: "Ambon" } },
      { ...base, id: "4", status: "dimuat" as const, total_koli: 3, destination: { name: "Ambon" } },
    ];
    expect(destinationTotals(rows).map((d) => [d.name, d.koli, d.n])).toEqual([["Sorong", 20, 1], ["Ambon", 8, 2]]);
  });
});
