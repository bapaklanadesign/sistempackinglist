CREATE OR REPLACE FUNCTION public.delete_transaction(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare old_row public.transactions; is_super boolean;
begin
  if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
  is_super := public.has_role(auth.uid(),'super_admin');
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'Alasan penghapusan wajib diisi (minimal 5 karakter)'; end if;
  select * into old_row from public.transactions where id = p_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not is_super and old_row.ledger is distinct from public.current_ledger() then
    raise exception 'Tidak memiliki akses ke transaksi ini';
  end if;
  if old_row.tx_type in ('transfer_in','transfer_out') then raise exception 'Transaksi transfer tidak dapat dihapus di sini'; end if;
  delete from public.transactions where id = p_id;
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, before_data, reason, result)
  values (p_id, old_row.ledger, auth.uid(), 'delete', to_jsonb(old_row), trim(p_reason), 'success');
end $function$;

REVOKE EXECUTE ON FUNCTION public.delete_transaction(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_transaction(uuid, text) TO authenticated;