import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ListOrdered, Pencil, Plus, Scale, Ship } from "lucide-react";
import { PageHeader } from "./_app";
import { Pager, Panel, QueryState, StatCard, td, th } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlStatusBadge, SearchBox, plMeta } from "@/components/packing/shared";
import { PL_CONDITIONS, conditionLabel, fmtNum, unitLabel } from "@/lib/packing-logic";
import { plItemsQ } from "@/lib/packing-data";

export const Route = createFileRoute("/_app/barang")({
  head: () => plMeta("Barang", "Seluruh barang dari semua Packing List."),
  component: Page,
});

function Page() {
  const q = useQuery(plItemsQ());
  const [search, setSearch] = useState("");
  const [cond, setCond] = useState("all");
  const [page, setPage] = useState(1);
  const s = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((i) => (cond === "all" || i.condition === cond) && (!s || i.name.toLowerCase().includes(s) || (i.pl?.pl_number ?? "").toLowerCase().includes(s) || (i.notes ?? "").toLowerCase().includes(s)));
  const pages = Math.max(1, Math.ceil(rows.length / 30));
  const sum = rows.reduce((a, i) => ({ qty: a.qty + Number(i.qty), w: a.w + Number(i.qty) * Number(i.weight_kg), v: a.v + Number(i.volume_m3) }), { qty: 0, w: 0, v: 0 });
  const edit = (id: string | undefined) => id && <Button asChild size="sm" variant="outline"><Link to="/packing-list/$id/edit" params={{ id }}><Pencil className="h-4 w-4" />Kelola</Link></Button>;
  return (
    <>
      <PageHeader title="Barang" subtitle="Barang diinput dan dikelola di dalam setiap Packing List">
        <Button asChild size="sm"><Link to="/packing-list/baru"><Plus className="h-4 w-4" />Input Barang di PL Baru</Link></Button>
      </PageHeader>
      <main className="min-w-0 space-y-4 p-3 sm:p-6">
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
          <StatCard compact index={0} icon={ListOrdered} tone="blue" label="Baris barang" value={rows.length} format="int" />
          <StatCard compact index={1} icon={Boxes} tone="cyan" label="Jumlah (koli)" value={sum.qty} format="koli" />
          <StatCard compact index={2} icon={Scale} tone="navy" label="Total berat" value={sum.w} format="kg" />
          <StatCard compact index={3} icon={Ship} tone="green" label="Total volume" value={sum.v} format="m3" />
        </div>
        <Panel title="Daftar Barang" action={<div className="flex flex-wrap gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama barang atau no. PL..." />
          <Select value={cond} onValueChange={(v) => { setCond(v); setPage(1); }}><SelectTrigger aria-label="Filter kondisi" className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Kondisi</SelectItem>{PL_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{conditionLabel[c]}</SelectItem>)}</SelectContent></Select>
        </div>}>
          <QueryState isLoading={q.isLoading} error={q.error} empty={!rows.length} emptyText={q.data?.length ? "Tidak ada barang yang cocok" : "Belum ada barang. Barang ditambahkan saat membuat Packing List."} onRetry={() => q.refetch()}>
            <div className="hidden overflow-x-auto lg:block"><table className="w-full">
              <thead><tr>{["Nama Barang", "No. PL", "Status", "Jumlah", "Total Berat", "Volume (m³)", "Nilai", "Kondisi", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
              <tbody>{rows.slice((page - 1) * 30, page * 30).map((i) => <tr key={i.id}>
                <td className={`${td} max-w-60 truncate font-semibold`} title={i.name}>{i.name}</td>
                <td className={td}>{i.pl ? <Link to="/packing-list/$id" params={{ id: i.pl.id }} className="text-primary hover:underline">{i.pl.pl_number}</Link> : "-"}</td>
                <td className={td}>{i.pl && <PlStatusBadge s={i.pl.status} />}</td>
                <td className={td}>{fmtNum(i.qty)} {unitLabel[i.unit] ?? i.unit}</td><td className={td}>{fmtNum(Number(i.qty) * Number(i.weight_kg))} kg</td>
                <td className={td}>{fmtNum(i.volume_m3, 4)}</td><td className={td}>{i.value_idr == null ? "-" : `Rp ${fmtNum(i.value_idr)}`}</td>
                <td className={td}>{conditionLabel[i.condition] ?? i.condition}</td><td className={td}>{edit(i.pl?.id)}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="divide-y lg:hidden">{rows.slice((page - 1) * 30, page * 30).map((i) => <article key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-3 text-xs">
              <div className="min-w-0"><p className="break-words text-sm font-semibold">{i.name}</p>
                <p className="text-muted-foreground">{i.pl?.pl_number} · {fmtNum(i.qty)} {unitLabel[i.unit] ?? i.unit} · {fmtNum(Number(i.qty) * Number(i.weight_kg))} kg · {conditionLabel[i.condition] ?? i.condition}</p></div>
              {edit(i.pl?.id)}
            </article>)}</div>
            <Pager page={page} pages={pages} onPage={setPage} />
          </QueryState>
        </Panel>
      </main>
    </>
  );
}
