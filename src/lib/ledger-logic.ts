import { parseAmount } from "./format";

export type Ledger = "admin1" | "admin2";
export type BalanceRow = { ledger: Ledger | null; name: string | null; balance: number | string | null; income: number | string | null; expense: number | string | null; sort_order: number | null };

/** Per-account comparison of Admin 1 vs Admin 2 balances. Status "Cocok" only when the difference is exactly 0. */
export function compareBalances(rows: BalanceRow[]) {
  const names = [...new Set([...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((r) => r.name ?? ""))];
  return names.map((name) => {
    const a1 = rows.find((r) => r.name === name && r.ledger === "admin1");
    const a2 = rows.find((r) => r.name === name && r.ledger === "admin2");
    const b1 = Number(a1?.balance ?? 0), b2 = Number(a2?.balance ?? 0);
    const diff = Math.round((b1 - b2) * 100) / 100;
    return { name, admin1: b1, admin2: b2, diff, status: !a1 || !a2 ? "Belum Ada" as const : diff === 0 ? "Cocok" as const : "Tidak Cocok" as const };
  });
}

export function ledgerTotals(rows: BalanceRow[], l: Ledger) {
  const r = rows.filter((x) => x.ledger === l);
  const s = (k: "balance" | "income" | "expense") => r.reduce((t, x) => t + Number(x[k] ?? 0), 0);
  return { saldo: s("balance"), masuk: s("income"), keluar: s("expense") };
}

type MTx = { id: string; ledger: Ledger; tx_date: string; tx_type: string; amount: number | string; description: string; bank_accounts: { name: string } | null };
/**
 * Pairs Admin 1 and Admin 2 entries with same date, account, type and amount (one-to-one).
 * Unpaired entries are "Belum Ada" (missing on the other side).
 */
export function matchTransactions(txs: MTx[]) {
  const key = (t: MTx) => `${t.tx_date}|${t.bank_accounts?.name ?? ""}|${t.tx_type}|${Number(t.amount).toFixed(2)}`;
  const pool = new Map<string, MTx[]>();
  txs.filter((t) => t.ledger === "admin2").forEach((t) => { const k = key(t); pool.set(k, [...(pool.get(k) ?? []), t]); });
  const out: { a1: MTx | null; a2: MTx | null; status: "Cocok" | "Belum Ada" }[] = [];
  txs.filter((t) => t.ledger === "admin1").forEach((t) => {
    const list = pool.get(key(t));
    const m = list?.shift() ?? null;
    out.push({ a1: t, a2: m, status: m ? "Cocok" : "Belum Ada" });
  });
  pool.forEach((list) => list.forEach((t) => out.push({ a1: null, a2: t, status: "Belum Ada" })));
  return out.sort((x, y) => ((y.a1 ?? y.a2)!.tx_date).localeCompare((x.a1 ?? x.a2)!.tx_date));
}

/** Converts an Excel cell to ISO date (accepts Date, "dd/mm/yyyy", "yyyy-mm-dd"). */
export function parseDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return valid(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return valid(+m[3]!, +m[2]!, +m[1]!);
  return null;
}
function valid(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
}

export type ImportRow = { account_id: string; tx_date: string; description: string; tx_type: "income" | "expense"; amount: number; category: string | null; fingerprint: string };
/** Validates one import row: [Tanggal, Rekening, Jenis, Keterangan, Kategori, Nominal]. */
export function parseImportRow(cells: unknown[], accounts: { id: string; name: string }[], dupIndex: number): { row?: ImportRow; error?: string } {
  const [d, acc, jenis, ket, kat, nom] = cells as (unknown)[];
  const tx_date = parseDateCell(d);
  if (!tx_date) return { error: "Tanggal tidak valid" };
  const a = accounts.find((x) => x.name.toLowerCase() === String(acc ?? "").trim().toLowerCase());
  if (!a) return { error: "Rekening tidak dikenal" };
  const j = String(jenis ?? "").trim().toLowerCase();
  const tx_type = ["pemasukan", "masuk", "income", "debit"].includes(j) ? "income" : ["pengeluaran", "keluar", "expense", "kredit"].includes(j) ? "expense" : null;
  if (!tx_type) return { error: "Jenis harus Pemasukan/Pengeluaran" };
  const description = String(ket ?? "").trim().slice(0, 200);
  if (!description) return { error: "Keterangan kosong" };
  const amount = parseAmount(nom);
  if (amount === null) return { error: "Nominal tidak valid" };
  const category = String(kat ?? "").trim().slice(0, 50) || null;
  const fingerprint = [tx_date, a.id, tx_type, amount.toFixed(2), description.toLowerCase(), dupIndex].join("|");
  return { row: { account_id: a.id, tx_date, description, tx_type, amount, category, fingerprint } };
}
