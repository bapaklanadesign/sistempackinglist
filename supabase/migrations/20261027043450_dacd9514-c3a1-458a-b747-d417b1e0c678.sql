CREATE OR REPLACE FUNCTION public.create_transaction(p_ledger public.ledger, p_account_id uuid, p_date date, p_description text, p_type public.tx_type, p_amount numeric, p_category text, p_client_ref uuid)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare new_row public.transactions; acc public.bank_accounts;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  if p_type not in ('income','expense') then raise exception 'Jenis transaksi tidak valid'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal harus lebih dari 0'; end if;
  if p_description is null or char_length(trim(p_description)) = 0 then raise exception 'Keterangan wajib diisi'; end if;
  select * into acc from public.bank_accounts where id = p_account_id;
  if not found then raise exception 'Rekening tidak ditemukan'; end if;
  if acc.ledger is distinct from p_ledger then raise exception 'Rekening tidak sesuai pembukuan'; end if;
  if p_client_ref is not null then
    select * into new_row from public.transactions where client_ref = p_client_ref;
    if found then return new_row; end if;
  end if;
  insert into public.transactions (ledger, account_id, tx_date, description, tx_type, amount, category, client_ref, created_by)
  values (p_ledger, p_account_id, p_date, trim(p_description), p_type, round(p_amount,2), nullif(trim(coalesce(p_category,'')),''), p_client_ref, auth.uid())
  returning * into new_row;
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, after_data, result)
  values (new_row.id, new_row.ledger, auth.uid(), 'create', to_jsonb(new_row), 'success');
  return new_row;
end $function$;

CREATE OR REPLACE FUNCTION public.delete_transaction(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare old_row public.transactions;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'Alasan penghapusan wajib diisi (minimal 5 karakter)'; end if;
  select * into old_row from public.transactions where id = p_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if old_row.tx_type in ('transfer_in','transfer_out') then raise exception 'Transaksi transfer tidak dapat dihapus di sini'; end if;
  delete from public.transactions where id = p_id;
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, before_data, reason, result)
  values (p_id, old_row.ledger, auth.uid(), 'delete', to_jsonb(old_row), trim(p_reason), 'success');
end $function$;

CREATE OR REPLACE FUNCTION public.create_bank_account(p_ledger public.ledger, p_name text, p_opening_balance numeric DEFAULT 0, p_sort_order integer DEFAULT 0)
RETURNS public.bank_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare new_row public.bank_accounts;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'Nama rekening wajib diisi'; end if;
  insert into public.bank_accounts (ledger, name, opening_balance, sort_order)
  values (p_ledger, trim(p_name), round(coalesce(p_opening_balance,0),2), coalesce(p_sort_order,0))
  returning * into new_row;
  insert into public.audit_logs (ledger, actor_id, action, after_data, result)
  values (new_row.ledger, auth.uid(), 'create_account', jsonb_build_object('account', new_row.name, 'opening_balance', new_row.opening_balance, 'sort_order', new_row.sort_order), 'success');
  return new_row;
end $function$;

CREATE OR REPLACE FUNCTION public.update_bank_account(p_id uuid, p_name text, p_sort_order integer)
RETURNS public.bank_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare old_row public.bank_accounts; new_row public.bank_accounts;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'Nama rekening wajib diisi'; end if;
  select * into old_row from public.bank_accounts where id = p_id for update;
  if not found then raise exception 'Rekening tidak ditemukan'; end if;
  update public.bank_accounts set name = trim(p_name), sort_order = coalesce(p_sort_order, old_row.sort_order) where id = p_id returning * into new_row;
  insert into public.audit_logs (ledger, actor_id, action, before_data, after_data, result)
  values (old_row.ledger, auth.uid(), 'update_account',
          jsonb_build_object('account', old_row.name, 'sort_order', old_row.sort_order),
          jsonb_build_object('account', new_row.name, 'sort_order', new_row.sort_order), 'success');
  return new_row;
end $function$;

CREATE OR REPLACE FUNCTION public.delete_bank_account(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare old_row public.bank_accounts;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  select * into old_row from public.bank_accounts where id = p_id for update;
  if not found then raise exception 'Rekening tidak ditemukan'; end if;
  if exists (select 1 from public.transactions where account_id = p_id) then
    raise exception 'Rekening memiliki transaksi dan tidak dapat dihapus';
  end if;
  delete from public.bank_accounts where id = p_id;
  insert into public.audit_logs (ledger, actor_id, action, before_data, result)
  values (old_row.ledger, auth.uid(), 'delete_account', jsonb_build_object('account', old_row.name, 'opening_balance', old_row.opening_balance), 'success');
end $function$;

GRANT EXECUTE ON FUNCTION public.create_transaction(public.ledger, uuid, date, text, public.tx_type, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bank_account(public.ledger, text, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_bank_account(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bank_account(uuid) TO authenticated;