import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tx } from "@/lib/data";

export function TransactionActions({ tx, onEdit, onDelete }: { tx: Pick<Tx, "id" | "transfer_id" | "tx_type">; onEdit?: (id: string) => void; onDelete: (id: string) => void }) {
  const transfer = !!tx.transfer_id || tx.tx_type === "transfer_in" || tx.tx_type === "transfer_out";
  return <div className="flex shrink-0 items-center gap-1">
    {!transfer && onEdit && <Button size="icon" variant="ghost" title="Edit transaksi" aria-label="Edit transaksi" onClick={() => onEdit(tx.id)}><Pencil className="h-4 w-4" /></Button>}
    <Button size="icon" variant="ghost" title={transfer ? "Hapus transfer" : "Hapus transaksi"} aria-label={transfer ? "Hapus transfer" : "Hapus transaksi"} className="text-destructive" onClick={() => onDelete(tx.id)}><Trash2 className="h-4 w-4" /></Button>
  </div>;
}