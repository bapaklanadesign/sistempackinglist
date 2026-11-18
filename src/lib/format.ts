export const rupiah = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return (v < 0 ? "-Rp " : "Rp ") + Math.abs(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });
};
export const shortJt = (n: number) => `${Math.round(n / 1_000_000)} Jt`;
export const fmtDate = (d: string) => d.split("-").reverse().join("/");
export const fmtDateTime = (d: string) => new Date(d).toLocaleString("id-ID");
export const today = () => new Date().toISOString().slice(0, 10);
export const txTypeLabel: Record<string, string> = {
  income: "Pemasukan", expense: "Pengeluaran", transfer_in: "Transfer Masuk", transfer_out: "Transfer Keluar",
};
/** Parse a money input ("1.500.000", "1500000,50") into a number with at most 2 decimals, or null. */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : null;
  const s = String(raw ?? "").trim().replace(/^rp\.?\s*/i, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n < 1e12 ? n : null;
}
export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Terjadi kesalahan tidak diketahui";
}
