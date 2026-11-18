import { describe, expect, it } from "vitest";
import { auditChanges, auditContext } from "@/lib/audit-display";

describe("Audit change projection", () => {
  it("includes changed financial fields, not unchanged values or internal metadata", () => {
    const before = { amount: 500000, account_id: "bank-1", description: "Pembayaran", updated_at: "old" };
    const after = { ...before, amount: 125000, updated_at: "new" };
    const snapshot = JSON.stringify({ before, after });
    const result = auditChanges(before, after, (id) => id);
    expect(result.map((r) => r.field)).toEqual(["amount"]);
    expect(result[0]?.before).not.toEqual(result[0]?.after);
    expect(JSON.stringify({ before, after })).toBe(snapshot);
  });

  it("keeps a zero opening balance instead of dropping it", () => {
    const result = auditChanges({ opening_balance: 0 }, { opening_balance: 1000000 }, (id) => id);
    expect(result).toHaveLength(1);
    expect(result[0]?.before).toContain("0");
    expect(result[0]?.after).toContain("1.000.000");
  });

  it("projects new transfer details without exposing identifiers", () => {
    const result = auditChanges(null, { from: "bank-1", to: "bank-2", amount: 100000, date: "2026-10-21", batch: "internal" }, (id) => ({ "bank-1": "BCA", "bank-2": "BRI" })[id] ?? "Unavailable");
    expect(result.map((r) => r.field).sort()).toEqual(["amount", "date", "from", "to"]);
    expect(result.find((r) => r.field === "from")?.after).toBe("BCA");
    expect(result.find((r) => r.field === "to")?.after).toBe("BRI");
  });

  it("handles incomplete historical records and preserves description context", () => {
    expect(auditChanges(null, null, (id) => id)).toEqual([]);
    expect(auditContext({ description: "Pembayaran" }, { amount: 125000 })).toBe("Pembayaran");
  });
});