import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/format";

export type ReviewStatus = "unchecked" | "match" | "mismatch";
export const reviewLabel: Record<ReviewStatus, string> = { unchecked: "Belum Diperiksa", match: "Cocok", mismatch: "Tidak Cocok" };
const tone: Record<ReviewStatus, string> = {
  unchecked: "bg-muted text-muted-foreground",
  match: "bg-success/15 text-success",
  mismatch: "bg-destructive/15 text-destructive",
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${tone[status]}`}>{reviewLabel[status]}</span>;
}

/** Super Admin control; saved through the set_review_status RPC, which checks the role and writes the audit log. */
export function ReviewSelect({ id, status }: { id: string; status: ReviewStatus }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const change = async (v: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("set_review_status", { p_id: id, p_status: v as ReviewStatus });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Status: ${reviewLabel[v as ReviewStatus]}`);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };
  return (
    <Select value={status} onValueChange={change} disabled={busy}>
      <SelectTrigger aria-label="Status pemeriksaan" className={`h-7 w-36 border-0 text-[11px] font-semibold ${tone[status]}`}><SelectValue /></SelectTrigger>
      <SelectContent>{(Object.keys(reviewLabel) as ReviewStatus[]).map((k) => <SelectItem key={k} value={k}>{reviewLabel[k]}</SelectItem>)}</SelectContent>
    </Select>
  );
}
