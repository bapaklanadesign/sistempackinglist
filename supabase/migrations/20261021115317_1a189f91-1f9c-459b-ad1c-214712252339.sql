create type public.review_status as enum ('unchecked','match','mismatch');
alter table public.transactions add column review_status public.review_status not null default 'unchecked',
  add column reviewed_by uuid, add column reviewed_at timestamptz;

create or replace function public.set_review_status(p_id uuid, p_status public.review_status)
returns void language plpgsql security definer set search_path = public as $$
declare old_row public.transactions;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin yang dapat menandai status'; end if;
  select * into old_row from public.transactions where id = p_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if old_row.review_status = p_status then return; end if;
  update public.transactions set review_status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, before_data, after_data, result)
  values (p_id, old_row.ledger, auth.uid(), 'review', jsonb_build_object('review_status', old_row.review_status),
          jsonb_build_object('review_status', p_status), 'success');
end $$;
revoke execute on function public.set_review_status(uuid, public.review_status) from anon, public;
grant execute on function public.set_review_status(uuid, public.review_status) to authenticated;