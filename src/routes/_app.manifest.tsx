import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, ClipboardList, Printer, Scale, Ship } from "lucide-react";
import { PageHeader } from "./_app";
import { Panel, QueryState, StatCard, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlStatusBadge, plMeta } from "@/components/packing/shared";
import { fmtDate } from "@/lib/format";
import { fmtNum, manifestGroups } from "@/lib/packing-logic";
import { plError, plListQ } from "@/lib/packing-data";
import { printManifest } from "@/lib/packing-pdf";

export const Route = createFileRoute("/_app/manifest")({
  head: () => plMeta("Manifest Kapal", "Rekap Packing List per perjalanan kapal."),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery(plListQ());
  const groups = useMemo(() => manifestGroups(q.data ?? []), [q.data]);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const g = groups.find((x) => x.key === key) ?? groups[0];
  const noVessel = (q.data ?? []).filter((p) => !p.vessel_id && p.status !== "dibatalkan").length;
  const print = async () => {
    if (!g) return;
    setBusy(true);
    try {
      // Re-read from the database so the manifest reflects the latest saved data.
      const fresh = manifestGroups(await qc.fetchQuery({ ...plListQ(), staleTime: 0 })).find((x) => x.key === g.key);
      if (!fresh) throw new Error("Perjalanan kapal ini sudah tidak memiliki Packing List");
      await printManifest({ vessel: fresh.pls[0]?.vessel?.name ?? "-", voyage: fresh.voyage_no, etd: fresh.etd }, fresh.pls);
      toast.success("Manifest PDF diunduh");
    } catch (e) { toast.error(plError(e)); }
    finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Manifest Kapal" subtitle="Packing List dikelompokkan per kapal dan nomor voyage (yang dibatalkan tidak dihitung)" />
      <main className="grid min-w-0 gap-4 p-3 sm:p-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <QueryState isLoading={q.isLoading} error={q.error} empty={!groups.length} emptyText="Belum ada Packing List yang memiliki kapal. Isi kapal & voyage pada Packing List atau menu Pengiriman." onRetry={() => q.refetch()}>
          <Panel title={`Perjalanan Kapal (${groups.length})`}>
            <div className="space-y-2">{groups.map((x) => (
              <button key={x.key} onClick={() => setKey(x.key)} className={cn("w-full rounded-lg border p-3 text-left text-xs", g?.key === x.key ? "border-primary bg-info-soft" : "hover:bg-muted")}>
                <p className="flex items-center gap-2 text-sm font-bold"><Ship className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{x.pls[0]?.vessel?.name}</span></p>
                <p className="mt-1 text-muted-foreground">Voyage {x.voyage_no || "-"} · ETD {x.etd ? fmtDate(x.etd) : "-"}</p>
                <p className="text-muted-foreground">{x.pls.length} PL · {fmtNum(x.koli)} koli · {fmtNum(x.weight)} kg</p>
              </button>
            ))}</div>
            {noVessel > 0 && <p className="mt-3 text-xs text-muted-foreground">{noVessel} Packing List belum memiliki kapal sehingga belum masuk manifest.</p>}
          </Panel>
          {g && <Panel title={`Manifest ${g.pls[0]?.vessel?.name ?? ""} · Voyage ${g.voyage_no || "-"}`} action={<Button size="sm" onClick={print} disabled={busy}><Printer className="h-4 w-4" />{busy ? "Menyiapkan..." : "Cetak Manifest PDF"}</Button>}>
            <div className="mb-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
              <StatCard compact index={0} icon={ClipboardList} tone="blue" label="Packing List" value={g.pls.length} format="int" />
              <StatCard compact index={1} icon={Boxes} tone="cyan" label="Total Koli" value={g.koli} format="koli" />
              <StatCard compact index={2} icon={Scale} tone="navy" label="Total Berat" value={g.weight} format="kg" />
              <StatCard compact index={3} icon={Ship} tone="green" label="Total Volume" value={g.volume} format="m3" />
            </div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full">
              <thead><tr>{["No. PL", "Pengirim", "Penerima", "Tujuan", "Kontainer", "Koli", "Berat (kg)", "Volume", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{g.pls.map((p) => <tr key={p.id}>
                <td className={td}><Link to="/packing-list/$id" params={{ id: p.id }} className="font-semibold text-primary hover:underline">{p.pl_number}</Link></td>
                <td className={td}>{p.shipper?.name}</td><td className={td}>{p.consignee?.name}</td><td className={td}>{p.destination?.name ?? "-"}</td><td className={td}>{p.container_no ?? "-"}</td>
                <td className={td}>{fmtNum(p.total_koli)}</td><td className={td}>{fmtNum(p.total_weight_kg)}</td><td className={td}>{fmtNum(p.total_volume_m3, 4)}</td><td className={td}><PlStatusBadge s={p.status} /></td>
              </tr>)}</tbody>
            </table></div>
            <div className="divide-y md:hidden">{g.pls.map((p) => <article key={p.id} className="py-2 text-xs">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Link to="/packing-list/$id" params={{ id: p.id }} className="break-words font-bold text-primary">{p.pl_number}</Link><PlStatusBadge s={p.status} /></div>
              <p className="break-words text-muted-foreground">{p.shipper?.name} → {p.consignee?.name} · {p.destination?.name ?? "-"}</p>
              <p className="text-muted-foreground">{fmtNum(p.total_koli)} koli · {fmtNum(p.total_weight_kg)} kg · {fmtNum(p.total_volume_m3, 4)} m³</p>
            </article>)}</div>
          </Panel>}
        </QueryState>
      </main>
    </>
  );
}
