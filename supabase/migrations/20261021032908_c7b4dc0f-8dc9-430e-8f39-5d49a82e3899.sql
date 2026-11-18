create or replace function public.import_transactions(p_file_name text, p_rows jsonb, p_skipped_invalid int)
returns public.import_batches language plpgsql security definer set search_path = public as $$
declare l public.ledger; b public.import_batches; inserted int; total int;
begin
  l := public.current_ledger();
  if l is null then raise exception 'Hanya Admin 1 / Admin 2 yang dapat mengimpor'; end if;
  total := jsonb_array_length(p_rows);
  if total = 0 then raise exception 'Tidak ada baris valid untuk diimpor'; end if;
  if total > 5000 then raise exception 'Maksimal 5000 baris per impor'; end if;
  insert into public.import_batches (ledger, file_name, created_by, status)
  values (l, left(coalesce(p_file_name,'file.xlsx'),200), auth.uid(), 'processing') returning * into b;
  with src as (
    select (r->>'account_id')::uuid account_id, (r->>'tx_date')::date tx_date, left(r->>'description',200) description,
      (r->>'tx_type')::public.tx_type tx_type, round((r->>'amount')::numeric,2) amount,
      nullif(left(coalesce(r->>'category',''),50),'') category, r->>'fingerprint' fingerprint
    from jsonb_array_elements(p_rows) r
  ), ins as (
    insert into public.transactions (ledger, account_id, tx_date, description, tx_type, amount, category, fingerprint, import_id, created_by)
    select l, account_id, tx_date, description, tx_type, amount, category, fingerprint, b.id, auth.uid() from src
    where tx_type in ('income','expense')
    on conflict (ledger, fingerprint) where fingerprint is not null do nothing
    returning 1
  ) select count(*) into inserted from ins;
  update public.import_batches set rows_total = total + coalesce(p_skipped_invalid,0), rows_imported = inserted,
    rows_skipped = total - inserted + coalesce(p_skipped_invalid,0), status = 'completed'
  where id = b.id returning * into b;
  insert into public.audit_logs (ledger, actor_id, action, after_data, result)
  values (l, auth.uid(), 'import', jsonb_build_object('batch', b.id, 'file', b.file_name, 'imported', inserted), 'success');
  return b;
end $$;
revoke execute on function public.import_transactions(text, jsonb, int) from public, anon;
grant execute on function public.import_transactions(text, jsonb, int) to authenticated;
alter publication supabase_realtime add table public.import_batches;