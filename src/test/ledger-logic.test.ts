import { describe, expect, it } from "vitest";
import { compareBalances, matchTransactions, parseDateCell, parseImportRow } from "@/lib/ledger-logic";
import { parseAmount } from "@/lib/format";

const tx = (id: string, ledger: "admin1" | "admin2", amount: number, name = "BCA") =>
  ({ id, ledger, tx_date: "2026-10-01", tx_type: "income", amount, description: "x", bank_accounts: { name } });

describe("ledger rules", () => {
  it("marks balances Cocok only when equal", () => {
    const r = compareBalances([
      { ledger: "admin1", name: "BCA", balance: 100, income: 0, expense: 0, sort_order: 1 },
      { ledger: "admin2", name: "BCA", balance: 100, income: 0, expense: 0, sort_order: 1 },
      { ledger: "admin1", name: "BRI", balance: 50, income: 0, expense: 0, sort_order: 2 },
      { ledger: "admin2", name: "BRI", balance: 40, income: 0, expense: 0, sort_order: 2 },
    ]);
    expect(r.map((x) => x.status)).toEqual(["Cocok", "Tidak Cocok"]);
    expect(r[1]?.diff).toBe(10);
  });
  it("pairs transactions one-to-one", () => {
    const r = matchTransactions([tx("a", "admin1", 10), tx("b", "admin1", 10), tx("c", "admin2", 10)]);
    expect(r.filter((x) => x.status === "Cocok")).toHaveLength(1);
    expect(r.filter((x) => x.status === "Belum Ada")).toHaveLength(1);
  });
  it("parses Indonesian amounts and rejects zero", () => {
    expect(parseAmount("1.500.000")).toBe(1500000);
    expect(parseAmount("0")).toBeNull();
  });
  it("rejects invalid dates and unknown accounts on import", () => {
    expect(parseDateCell("31/02/2026")).toBeNull();
    expect(parseImportRow(["01/10/2026", "XYZ", "Pemasukan", "a", "", "10"], [{ id: "1", name: "BCA" }], 0).error).toBe("Rekening tidak dikenal");
    expect(parseImportRow(["01/10/2026", "bca", "Pengeluaran", "a", "", "10"], [{ id: "1", name: "BCA" }], 0).row?.tx_type).toBe("expense");
  });
});
