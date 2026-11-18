create type public.app_role as enum ('super_admin','admin1','admin2');
create type public.ledger as enum ('admin1','admin2');
create type public.tx_type as enum ('income','expense','transfer_in','transfer_out');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id),
  created_at timestamptz not null default now()
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_ledger()
returns public.ledger language sql stable security definer set search_path = public as $$
  select case role when 'admin1' then 'admin1'::public.ledger when 'admin2' then 'admin2'::public.ledger end
  from public.user_roles where user_id = auth.uid()
$$;

create policy "own profile or super admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "own role or super admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

create or replace function public.update_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_profiles_upd before update on public.profiles for each row execute function public.update_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- bank accounts
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  ledger public.ledger not null,
  name text not null check (char_length(name) between 1 and 50),
  opening_balance numeric(18,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ledger, name)
);
grant select, insert, update on public.bank_accounts to authenticated;
grant all on public.bank_accounts to service_role;
alter table public.bank_accounts enable row level security;
create policy "read accounts" on public.bank_accounts for select to authenticated
  using (public.has_role(auth.uid(),'super_admin') or ledger = public.current_ledger());
create policy "super admin insert accounts" on public.bank_accounts for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin'));
create policy "super admin update accounts" on public.bank_accounts for update to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));
create trigger trg_accounts_upd before update on public.bank_accounts for each row execute function public.update_updated_at();

insert into public.bank_accounts (ledger, name, sort_order)
select l::public.ledger, n, o from unnest(array['admin1','admin2']) l
cross join (values ('BCA',1),('BRI',2),('Mandiri',3),('BNI',4),('MDU',5)) a(n,o);

-- import batches
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  ledger public.ledger not null,
  file_name text not null,
  rows_total int not null default 0,
  rows_imported int not null default 0,
  rows_skipped int not null default 0,
  status text not null default 'completed',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert on public.import_batches to authenticated;
grant all on public.import_batches to service_role;
alter table public.import_batches enable row level security;
create policy "read imports" on public.import_batches for select to authenticated
  using (public.has_role(auth.uid(),'super_admin') or ledger = public.current_ledger());
create policy "insert own imports" on public.import_batches for insert to authenticated
  with check (ledger = public.current_ledger() and created_by = auth.uid());

-- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  ledger public.ledger not null,
  account_id uuid not null references public.bank_accounts(id),
  tx_date date not null,
  description text not null check (char_length(description) between 1 and 200),
  tx_type public.tx_type not null,
  amount numeric(18,2) not null check (amount > 0 and amount < 1000000000000),
  category text check (category is null or char_length(category) <= 50),
  transfer_id uuid,
  import_id uuid references public.import_batches(id),
  fingerprint text,
  client_ref uuid unique,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tx_ledger_date on public.transactions (ledger, tx_date desc);
create index idx_tx_account on public.transactions (account_id);
create index idx_tx_transfer on public.transactions (transfer_id);
create unique index uq_tx_fingerprint on public.transactions (ledger, fingerprint) where fingerprint is not null;
grant select, insert on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
alter table public.transactions replica identity full;
create policy "read transactions" on public.transactions for select to authenticated
  using (public.has_role(auth.uid(),'super_admin') or ledger = public.current_ledger());
create policy "admins insert own ledger" on public.transactions for insert to authenticated
  with check (ledger = public.current_ledger() and created_by = auth.uid()
              and tx_type in ('income','expense') and transfer_id is null);

create or replace function public.validate_transaction() returns trigger language plpgsql set search_path = public as $$
declare acc_ledger public.ledger;
begin
  select ledger into acc_ledger from public.bank_accounts where id = new.account_id;
  if acc_ledger is null or acc_ledger <> new.ledger then
    raise exception 'Rekening tidak sesuai dengan pembukuan';
  end if;
  if new.tx_date > current_date + 1 or new.tx_date < date '2000-01-01' then
    raise exception 'Tanggal transaksi tidak valid';
  end if;
  return new;
end $$;
create trigger trg_tx_validate before insert or update on public.transactions for each row execute function public.validate_transaction();
create trigger trg_tx_upd before update on public.transactions for each row execute function public.update_updated_at();

-- audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  ledger public.ledger,
  actor_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  result text not null default 'success',
  created_at timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs (created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "super admin reads audit" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'super_admin'));

-- reconciliations
create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  as_of date not null,
  balance_admin1 numeric(18,2) not null,
  balance_admin2 numeric(18,2) not null,
  difference numeric(18,2) not null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert on public.reconciliations to authenticated;
grant all on public.reconciliations to service_role;
alter table public.reconciliations enable row level security;
create policy "super admin reads recon" on public.reconciliations for select to authenticated
  using (public.has_role(auth.uid(),'super_admin'));
create policy "super admin inserts recon" on public.reconciliations for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin') and created_by = auth.uid());

-- balances view (RLS of caller applies)
create view public.account_balances with (security_invoker = true) as
select a.id as account_id, a.ledger, a.name, a.sort_order, a.opening_balance,
  coalesce(sum(t.amount) filter (where t.tx_type='income'),0)::numeric(18,2) as income,
  coalesce(sum(t.amount) filter (where t.tx_type='expense'),0)::numeric(18,2) as expense,
  coalesce(sum(t.amount) filter (where t.tx_type='transfer_in'),0)::numeric(18,2) as transfer_in,
  coalesce(sum(t.amount) filter (where t.tx_type='transfer_out'),0)::numeric(18,2) as transfer_out,
  (a.opening_balance
   + coalesce(sum(t.amount) filter (where t.tx_type in ('income','transfer_in')),0)
   - coalesce(sum(t.amount) filter (where t.tx_type in ('expense','transfer_out')),0))::numeric(18,2) as balance
from public.bank_accounts a left join public.transactions t on t.account_id = a.id
group by a.id;
grant select on public.account_balances to authenticated;

-- RPC: update transaction with audit (atomic)
create or replace function public.update_transaction(
  p_id uuid, p_account_id uuid, p_date date, p_description text, p_type public.tx_type,
  p_amount numeric, p_category text, p_reason text)
returns public.transactions language plpgsql security definer set search_path = public as $$
declare old_row public.transactions; new_row public.transactions; is_super boolean;
begin
  if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
  is_super := public.has_role(auth.uid(),'super_admin');
  select * into old_row from public.transactions where id = p_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not is_super and old_row.ledger is distinct from public.current_ledger() then
    raise exception 'Tidak memiliki akses ke transaksi ini';
  end if;
  if old_row.tx_type in ('transfer_in','transfer_out') or p_type in ('transfer_in','transfer_out') then
    raise exception 'Transaksi transfer tidak dapat diedit di sini';
  end if;
  if is_super and (p_reason is null or char_length(trim(p_reason)) < 5) then
    raise exception 'Alasan perubahan wajib diisi (minimal 5 karakter)';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal harus lebih dari 0'; end if;
  update public.transactions set account_id = p_account_id, tx_date = p_date,
    description = trim(p_description), tx_type = p_type, amount = round(p_amount,2),
    category = nullif(trim(coalesce(p_category,'')),'')
  where id = p_id returning * into new_row;
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, before_data, after_data, reason, result)
  values (p_id, old_row.ledger, auth.uid(), 'update', to_jsonb(old_row), to_jsonb(new_row), nullif(trim(coalesce(p_reason,'')),''), 'success');
  return new_row;
end $$;

-- RPC: internal transfer (two rows, same transfer_id)
create or replace function public.create_transfer(
  p_from uuid, p_to uuid, p_amount numeric, p_date date, p_note text, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.ledger; lf public.ledger; lt public.ledger; tid uuid := gen_random_uuid(); bal numeric;
begin
  l := public.current_ledger();
  if l is null then raise exception 'Hanya Admin 1 / Admin 2 yang dapat transfer'; end if;
  if p_from = p_to then raise exception 'Rekening asal dan tujuan harus berbeda'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal harus lebih dari 0'; end if;
  select ledger into lf from public.bank_accounts where id = p_from;
  select ledger into lt from public.bank_accounts where id = p_to;
  if lf is distinct from l or lt is distinct from l then raise exception 'Rekening tidak valid'; end if;
  if exists (select 1 from public.transactions where client_ref = p_client_ref) then
    select transfer_id into tid from public.transactions where client_ref = p_client_ref; return tid;
  end if;
  select balance into bal from public.account_balances where account_id = p_from;
  if bal < p_amount then raise exception 'Saldo rekening asal tidak cukup'; end if;
  insert into public.transactions (ledger, account_id, tx_date, description, tx_type, amount, transfer_id, client_ref, created_by, category)
  values (l, p_from, p_date, coalesce(nullif(trim(p_note),''),'Transfer internal'), 'transfer_out', round(p_amount,2), tid, p_client_ref, auth.uid(), 'Transfer'),
         (l, p_to, p_date, coalesce(nullif(trim(p_note),''),'Transfer internal'), 'transfer_in', round(p_amount,2), tid, null, auth.uid(), 'Transfer');
  insert into public.audit_logs (transaction_id, ledger, actor_id, action, after_data, result)
  values (tid, l, auth.uid(), 'transfer', jsonb_build_object('from',p_from,'to',p_to,'amount',p_amount,'date',p_date), 'success');
  return tid;
end $$;

-- RPC: super admin sets opening balance with audit
create or replace function public.set_opening_balance(p_account_id uuid, p_amount numeric, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare old_row public.bank_accounts;
begin
  if not public.has_role(auth.uid(),'super_admin') then raise exception 'Hanya Super Admin'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'Alasan wajib diisi'; end if;
  select * into old_row from public.bank_accounts where id = p_account_id for update;
  if not found then raise exception 'Rekening tidak ditemukan'; end if;
  update public.bank_accounts set opening_balance = round(p_amount,2) where id = p_account_id;
  insert into public.audit_logs (ledger, actor_id, action, before_data, after_data, reason)
  values (old_row.ledger, auth.uid(), 'opening_balance', jsonb_build_object('account',old_row.name,'opening_balance',old_row.opening_balance),
          jsonb_build_object('account',old_row.name,'opening_balance',round(p_amount,2)), trim(p_reason));
end $$;

revoke execute on function public.update_transaction, public.create_transfer, public.set_opening_balance from public, anon;
grant execute on function public.update_transaction, public.create_transfer, public.set_opening_balance to authenticated;

alter publication supabase_realtime add table public.transactions, public.bank_accounts, public.audit_logs;