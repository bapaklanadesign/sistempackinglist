import { describe, expect, it } from "vitest";
import { PL_STATUSES, canDeletePl, canEditPl, emptyItem, itemTotals, itemVolume, manifestGroups, plStatusLabel, plSummary, upcomingDepartures, validatePl, type PlStatus } from "@/lib/packing-logic";

const pl = (id: string, status: PlStatus, extra: Partial<{ etd: string | null; vessel_id: string | null; voyage_no: string | null; koli: number }> = {}) => ({
  id, status, item_count: 2, total_koli: extra.koli ?? 10, total_weight_kg: 100, total_volume_m3: 1.5, etd: extra.etd ?? null, vessel_id: extra.vessel_id ?? null, voyage_no: extra.voyage_no ?? null,
});

describe("Packing List rules", () => {
  it("uses the seven agreed shipment statuses in order", () => {
    expect(PL_STATUSES.map((s) => plStatusLabel[s])).toEqual(["Draft", "Siap Dimuat", "Dimuat", "Berlayar", "Tiba", "Selesai", "Dibatalkan"]);
  });
  it("lets every role edit but only Super Admin delete", () => {
    expect([canEditPl("super_admin"), canEditPl("admin1"), canEditPl("admin2")]).toEqual([true, true, true]);
    expect([canDeletePl("super_admin"), canDeletePl("admin1"), canDeletePl("admin2"), canDeletePl(null)]).toEqual([true, false, false, false]);
  });
  it("calculates volume from dimensions before a manual volume", () => {
    expect(itemVolume(10, 50, 40, 30, 9)).toBe(0.6);
    expect(itemVolume(2, null, 40, 30, 0.8)).toBe(0.8);
  });
  it("totals koli, weight per unit × qty, volume and value like the database", () => {
    const t = itemTotals([{ ...emptyItem(), name: "A", qty: 10, weight_kg: 12.5, length_cm: 50, width_cm: 40, height_cm: 30, value_idr: 500000 }, { ...emptyItem(), name: "B", qty: 2, weight_kg: 40, volume_m3: 0.8 }]);
    expect(t).toEqual({ count: 2, koli: 12, weight: 205, volume: 1.4, value: 500000 });
  });
  it("requires sender, receiver and valid items", () => {
    const h = { pl_date: "2026-11-14", shipper_id: "s", consignee_id: "c", vessel_id: "", voyage_no: "", origin_port_id: "", destination_port_id: "", container_no: "", seal_no: "", etd: "", eta: "", notes: "" };
    expect(validatePl({ ...h, shipper_id: "" }, [{ ...emptyItem(), name: "A" }])).toBe("Pengirim wajib dipilih");
    expect(validatePl(h, [{ ...emptyItem(), name: "A", qty: 0 }])).toBe("Jumlah barang baris 1 harus lebih dari 0");
    expect(validatePl({ ...h, etd: "2026-11-20", eta: "2026-11-19" }, [{ ...emptyItem(), name: "A" }])).toBe("ETA tidak boleh lebih awal dari ETD");
    expect(validatePl(h, [{ ...emptyItem(), name: "A" }])).toBeNull();
  });
  it("counts every document per status but leaves cancelled cargo out of totals", () => {
    const s = plSummary([pl("1", "draft"), pl("2", "berlayar"), pl("3", "dibatalkan")]);
    expect([s.documents, s.items, s.koli, s.weight, s.volume]).toEqual([3, 4, 20, 200, 3]);
    expect([s.byStatus.draft, s.byStatus.berlayar, s.byStatus.dibatalkan, s.byStatus.selesai]).toEqual([1, 1, 1, 0]);
  });
  it("lists upcoming departures not yet sailed, grouped per ship voyage", () => {
    const g = upcomingDepartures([pl("1", "dimuat", { etd: "2026-11-20", vessel_id: "v", voyage_no: "5" }), pl("2", "draft", { etd: "2026-11-20", vessel_id: "v", voyage_no: "5" }),
      pl("3", "berlayar", { etd: "2026-11-21", vessel_id: "v" }), pl("4", "draft", { etd: "2026-11-10", vessel_id: "v" })], "2026-11-14");
    expect(g.map((x) => [x.etd, x.pls.map((p) => p.id)])).toEqual([["2026-11-20", ["1", "2"]]]);
  });
  it("builds a manifest per ship and voyage without cancelled Packing Lists", () => {
    const g = manifestGroups([pl("1", "dimuat", { vessel_id: "v", voyage_no: "5", koli: 3 }), pl("2", "draft", { vessel_id: "v", voyage_no: " 5 ", koli: 4 }),
      pl("3", "dibatalkan", { vessel_id: "v", voyage_no: "5" }), pl("4", "draft", { vessel_id: "w", voyage_no: "5" }), pl("5", "draft")]);
    expect(g.map((x) => [x.vessel_id, x.pls.map((p) => p.id), x.koli]).sort()).toEqual([["v", ["1", "2"], 7], ["w", ["4"], 10]]);
  });
});
