import { useEffect, useState } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Ledger } from "./auth";

export type Tx = Database["public"]["Tables"]["transactions"]["Row"];
export type Balance = Database["public"]["Views"]["account_balances"]["Row"];
export type Account = Database["public"]["Tables"]["bank_accounts"]["Row"];

const unwrap = <T,>(r: { data: T | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export const balancesQ = () =>
  queryOptions({
    queryKey: ["balances"],
    queryFn: async () => unwrap(await supabase.from("account_balances").select("*").order("sort_order")) as Balance[],
  });

export const accountsQ = () =>
  queryOptions({
    queryKey: ["accounts"],
    queryFn: async () => unwrap(await supabase.from("bank_accounts").select("*").order("sort_order")) as Account[],
  });

export type TxFilter = { from?: string | undefined; to?: string | undefined; ledger?: Ledger | "all" | undefined; accountName?: string | undefined; q?: string | undefined };

/** Fetches all transactions in the period visible to the caller (RLS enforces ledger access), paging past the 1000-row cap. */
export const txQ = (f: TxFilter) =>
  queryOptions({
    queryKey: ["transactions", f],
    queryFn: async () => {
      const out: (Tx & { bank_accounts: { name: string } | null })[] = [];
      for (let page = 0; page < 50; page++) {
        let q = supabase.from("transactions").select("*, bank_accounts(name)")
          .order("tx_date", { ascending: false }).order("created_at", { ascending: false })
          .range(page * 1000, page * 1000 + 999);
        if (f.from) q = q.gte("tx_date", f.from);
        if (f.to) q = q.lte("tx_date", f.to);
        if (f.ledger && f.ledger !== "all") q = q.eq("ledger", f.ledger);
        if (f.q) q = q.ilike("description", `%${f.q.replace(/[%_]/g, "")}%`);
        const rows = unwrap(await q) as typeof out;
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return f.accountName && f.accountName !== "all" ? out.filter((t) => t.bank_accounts?.name === f.accountName) : out;
    },
  });

export type RealtimeStatus = "connecting" | "live" | "offline";

// Shared here (not in a route file) because route components are code-split into separate module instances.
let rtStatus: RealtimeStatus = "connecting";
const rtListeners = new Set<(s: RealtimeStatus) => void>();
function publishRt(s: RealtimeStatus) { rtStatus = s; rtListeners.forEach((l) => l(s)); }
export function useRtStatus() {
  const [s, set] = useState(rtStatus);
  useEffect(() => { set(rtStatus); rtListeners.add(set); return () => { rtListeners.delete(set); }; }, []);
  return s;
}

/** Subscribes to ledger tables; every event and every reconnect triggers a fresh database read. */
export function useRealtimeSync(enabled: boolean) {
  const qc = useQueryClient();
  const setStatus = publishRt;
  useEffect(() => {
    if (!enabled) return;
    let wasOffline = false;
    const refetch = () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      qc.invalidateQueries({ queryKey: ["imports"] });
      plRefetch();
    };
    // Packing List queries all live under the ["pl"] key.
    function plRefetch() { qc.invalidateQueries({ queryKey: ["pl"] }); }
    const channel = supabase
      .channel(`ledger-sync-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" }, refetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => qc.invalidateQueries({ queryKey: ["audit"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "pl_packing_lists" }, plRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "pl_parties" }, plRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "pl_vessels" }, plRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "pl_ports" }, plRefetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pl_activity_logs" }, plRefetch)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          if (wasOffline) refetch();
          wasOffline = false;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
          wasOffline = true;
        }
      });
    const onOnline = () => refetch();
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("online", onOnline); supabase.removeChannel(channel); };
  }, [enabled, qc]);
  return useRtStatus();
}

export const sumBy = (rows: Tx[], type: Tx["tx_type"]) => rows.filter((t) => t.tx_type === type).reduce((s, t) => s + Number(t.amount), 0);

export type TxRow = Tx & { bank_accounts: { name: string } | null };

export const txCountQ = () =>
  queryOptions({
    queryKey: ["transactions", "count"],
    queryFn: async () => {
      const c = async (l: Ledger) => {
        const r = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("ledger", l);
        if (r.error) throw new Error(r.error.message);
        return r.count ?? 0;
      };
      const [admin1, admin2] = await Promise.all([c("admin1"), c("admin2")]);
      return { admin1, admin2 };
    },
  });

export const auditQ = (page: number) =>
  queryOptions({
    queryKey: ["audit", page],
    queryFn: async () => {
      const r = await supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * 25, page * 25 + 24);
      if (r.error) throw new Error(r.error.message);
      return { rows: r.data, count: r.count ?? 0 };
    },
  });

export const profilesQ = () =>
  queryOptions({
    queryKey: ["profiles"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      if (p.error) throw new Error(p.error.message);
      if (r.error) throw new Error(r.error.message);
      return p.data.map((x) => ({ ...x, role: r.data.find((y) => y.user_id === x.id)?.role ?? null }));
    },
  });

export const importsQ = () =>
  queryOptions({
    queryKey: ["imports"],
    queryFn: async () => unwrap(await supabase.from("import_batches").select("*").order("created_at", { ascending: false }).limit(20)),
  });

export function monthStart(offsetMonths = 0) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offsetMonths);
  return d.toISOString().slice(0, 8) + "01";
}
