import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, UserRound } from "lucide-react";
import { PageHeader } from "./_app";
import { Pager, QueryState } from "@/components/ui-kit";
import { accountsQ, auditQ, profilesQ } from "@/lib/data";
import { auditActivity, auditChanges, auditContext, auditTime, type AuditChange } from "@/lib/audit-display";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Audit Log • Riwayat Aktivitas — MR Express Ledger" }, { name: "description", content: "Riwayat aktivitas pembukuan MR Express: pengguna, waktu, data sebelum dan sesudah, serta alasan perubahan." }, { property: "og:title", content: "Audit Log • Riwayat Aktivitas — MR Express Ledger" }, { property: "og:description", content: "Rincian perubahan pembukuan dan pemeriksaan transaksi MR Express." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Changes({ changes }: { changes: AuditChange[] }) {
  if (!changes.length) return <p className="text-xs text-muted-foreground">Tidak ada rincian perubahan yang tercatat.</p>;
  return <div className="space-y-3">{changes.map((change) => (
    <div key={change.field}>
      <p className="mb-1 text-xs font-semibold">{change.label}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0 rounded bg-muted p-2"><p className="mb-1 text-[10px] font-semibold text-muted-foreground">Sebelum</p><p className="break-words leading-relaxed">{change.before}</p></div>
        <div className="min-w-0 rounded bg-info-soft p-2"><p className="mb-1 text-[10px] font-semibold text-primary">Sesudah</p><p className="break-words font-medium leading-relaxed">{change.after}</p></div>
      </div>
    </div>
  ))}</div>;
}

function Page() {
  const [page, setPage] = useState(1);
  const q = useQuery(auditQ(page - 1));
  const people = useQuery(profilesQ());
  const accounts = useQuery(accountsQ());
  const acc = (id: string) => {
    const account = accounts.data?.find((a) => a.id === id);
    return account ? `${account.name} · ${account.ledger === "admin1" ? "Admin Laporan 1" : "Admin Laporan 2"}` : "Rekening tidak tersedia";
  };
  const records = q.data?.rows.map((r) => {
    const person = people.data?.find((p) => p.id === r.actor_id);
    return { ...r, person: person?.full_name?.trim() || person?.email || "Nama pengguna tidak tersedia", email: person?.full_name?.trim() ? person.email : null,
      activity: auditActivity[r.action] ?? "Aktivitas pembukuan", time: auditTime(r.created_at),
      ledgerLabel: r.ledger === "admin1" ? "Admin Laporan 1" : r.ledger === "admin2" ? "Admin Laporan 2" : "Umum",
      changes: auditChanges(r.before_data, r.after_data, acc), context: auditContext(r.before_data, r.after_data) };
  });
  return (
    <>
      <PageHeader title="Audit Log" subtitle="Riwayat aktivitas pembukuan" />
      <main className="min-w-0 p-3 sm:p-6">
        <section aria-label="Riwayat aktivitas">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="flex min-w-0 items-center gap-2 font-bold"><History className="h-4 w-4 shrink-0 text-primary" />Riwayat Aktivitas</h2>
            {q.data && <span className="text-xs text-muted-foreground">{q.data.count.toLocaleString("id-ID")} aktivitas</span>}
          </div>
          {(people.error || accounts.error) && <p role="alert" className="mb-3 rounded bg-warning-soft p-3 text-xs text-warning">Sebagian nama pengguna atau rekening belum dapat dimuat. Riwayat perubahan tetap ditampilkan.</p>}
          <QueryState isLoading={q.isLoading} error={q.error} empty={!q.data?.rows.length} emptyText="Belum ada perubahan tercatat" onRetry={() => q.refetch()}>
            <div className="hidden overflow-x-auto rounded-lg border bg-card lg:block"><table className="w-full table-fixed text-left text-sm">
              <colgroup><col className="w-[13%]" /><col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[35%]" /><col className="w-[17%]" /></colgroup>
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Waktu", "Pengguna", "Aktivitas", "Data sebelum & sesudah", "Alasan perubahan"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{records?.map((r) => (
                <tr key={r.id} className="border-t align-top hover:bg-muted/30">
                  <td className="p-4 text-xs"><time dateTime={r.created_at} className="font-medium">{r.time.date}</time><p className="mt-1 text-muted-foreground">{r.time.time}</p></td>
                  <td className="break-words p-4"><p className="font-semibold">{r.person}</p>{r.email && <p className="mt-1 text-xs text-muted-foreground">{r.email}</p>}</td>
                  <td className="break-words p-4"><p className="font-medium">{r.activity}</p><p className="mt-1 text-xs text-primary">{r.ledgerLabel}</p>{r.context && <p className="mt-2 text-xs text-muted-foreground">{r.context}</p>}</td>
                  <td className="p-4"><Changes changes={r.changes} /></td>
                  <td className="break-words p-4 text-xs leading-relaxed">{r.reason?.trim() || "Tidak ada alasan tercatat"}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <div className="space-y-3 lg:hidden">{records?.map((r) => (
              <article key={r.id} className="min-w-0 rounded-lg border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><h3 className="min-w-0 break-words text-sm font-bold">{r.activity}</h3><span className="shrink-0 text-xs font-medium text-primary">{r.ledgerLabel}</span></div>
                <time dateTime={r.created_at} className="mt-1 block text-xs text-muted-foreground">{r.time.date} · {r.time.time}</time>
                <div className="my-3 flex min-w-0 items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words text-xs font-semibold">{r.person}</p>{r.email && <p className="mt-0.5 break-words text-xs text-muted-foreground">{r.email}</p>}</div></div>
                {r.context && <p className="mb-3 break-words text-xs text-muted-foreground">{r.context}</p>}
                <div className="border-t pt-3"><Changes changes={r.changes} /></div>
                <div className="mt-3 border-t pt-3"><p className="mb-1 text-xs font-semibold">Alasan perubahan</p><p className="break-words text-xs leading-relaxed text-muted-foreground">{r.reason?.trim() || "Tidak ada alasan tercatat"}</p></div>
              </article>
            ))}</div>
            <Pager page={page} pages={Math.max(1, Math.ceil((q.data?.count ?? 0) / 25))} onPage={setPage} />
          </QueryState>
        </section>
      </main>
    </>
  );
}
