import { fmtDate, rupiah, txTypeLabel } from "./format";

type Values = Record<string, unknown>;
export type AuditChange = { field: string; label: string; before: string; after: string };
const labels: Record<string, string> = {
  account_id: "Rekening", account: "Rekening", tx_date: "Tanggal transaksi", date: "Tanggal transfer",
  description: "Keterangan", tx_type: "Jenis transaksi", amount: "Nominal", category: "Kategori",
  opening_balance: "Saldo awal", review_status: "Status pemeriksaan", status: "Status pemeriksaan",
  from: "Rekening asal", to: "Rekening tujuan", file: "Nama berkas", imported: "Transaksi diimpor",
  rows_total: "Jumlah baris", rows_imported: "Transaksi diimpor", rows_skipped: "Baris dilewati", note: "Catatan",
  sort_order: "Urutan tampilan", full_name: "Nama", email: "Email", role: "Peran",
};
const roleNames: Record<string, string> = { super_admin: "Super Admin", admin1: "Admin Laporan 1", admin2: "Admin Laporan 2", admin_packing: "Admin Packing List" };
export const auditActivity: Record<string, string> = {
  update: "Mengubah transaksi", transfer: "Transfer antar rekening", import: "Mengimpor transaksi Excel",
  opening_balance: "Mengubah saldo awal", review_status: "Memeriksa transaksi", review: "Memeriksa transaksi",
  create: "Menambah transaksi", delete: "Menghapus transaksi",
  create_account: "Menambah rekening", update_account: "Mengubah rekening", delete_account: "Menghapus rekening",
  user_create: "Membuat akun pengguna", user_update: "Mengubah akun pengguna", user_disable: "Menonaktifkan akun",
  user_enable: "Mengaktifkan akun", user_reset_password: "Reset password akun",
  user_delete: "Menghapus akun pengguna",
};
const review: Record<string, string> = { unchecked: "Belum Diperiksa", match: "Cocok", mismatch: "Tidak Cocok" };
function values(data: unknown): Values {
  return data && typeof data === "object" && !Array.isArray(data) ? data as Values : {};
}
export function auditChanges(beforeData: unknown, afterData: unknown, accountName: (id: string) => string): AuditChange[] {
  const before = values(beforeData), after = values(afterData);
  const format = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (["amount", "opening_balance"].includes(key)) return Number.isFinite(Number(value)) ? rupiah(Number(value)) : "Nilai tidak tersedia";
    if (["account_id", "from", "to"].includes(key)) return accountName(String(value));
    if (["review_status", "status"].includes(key)) return review[String(value)] ?? "Status lainnya";
    if (key === "role") return roleNames[String(value)] ?? "Peran lainnya";
    if (key === "tx_type") return txTypeLabel[String(value)] ?? "Jenis lainnya";
    if (["tx_date", "date"].includes(key)) return fmtDate(String(value));
    return typeof value === "object" ? "Rincian tidak tersedia" : String(value);
  };
  return Object.keys(labels)
    .filter((key) => (key in before || key in after) && (beforeData == null || afterData == null || JSON.stringify(before[key]) !== JSON.stringify(after[key])))
    .map((key) => ({ field: key, label: labels[key] ?? "Data berubah", before: format(key, before[key]), after: format(key, after[key]) }));
}
export function auditContext(beforeData: unknown, afterData: unknown): string | null {
  const before = values(beforeData), after = values(afterData);
  const description = after["description"] ?? before["description"];
  return typeof description === "string" && description.trim() ? description : null;
}
export function auditTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { date: "Waktu tidak tersedia", time: "" };
  return {
    date: date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB",
  };
}