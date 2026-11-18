-- Packing List schema as it exists in the connected Supabase project (read 2026-11-14), for isolated PGlite tests only.
-- Supabase-provided pieces (auth.uid, roles, has_role, is_staff) are replaced with test stubs driven by test.actor / test.role.
create role anon; create role authenticated; create schema auth;
create publication supabase_realtime;
create type app_role as enum ('super_admin', 'admin1', 'admin2', 'admin_packing');
create type pl_status as enum ('draft','siap_dimuat','dimuat','berlayar','tiba','selesai','dibatalkan');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.actor', true), '')::uuid $$;
create function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable as $$ select _user_id is not null and current_setting('test.role', true) = _role::text $$;
-- Mirrors live is_staff(): Packing List access is Super Admin + Admin Packing List only.
create function public.is_staff() returns boolean language sql stable as $$ select coalesce(current_setting('test.role', true), '') in ('super_admin','admin_packing') $$;
create table public.profiles (id uuid primary key, full_name text not null default '', email text not null default '');

create table public.pl_parties (id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('pengirim','penerima')), name text not null check (char_length(trim(name)) between 1 and 120),
  company text, phone text, address text, city text, notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.pl_vessels (id uuid primary key default gen_random_uuid(), name text not null check (char_length(trim(name)) between 1 and 120), operator text, call_sign text, notes text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.pl_ports (id uuid primary key default gen_random_uuid(), name text not null check (char_length(trim(name)) between 1 and 120), city text, code text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create sequence public.pl_number_seq;
create table public.pl_packing_lists (id uuid primary key default gen_random_uuid(), pl_number text not null unique, pl_date date not null default current_date,
  shipper_id uuid not null references pl_parties(id), consignee_id uuid not null references pl_parties(id), vessel_id uuid references pl_vessels(id), voyage_no text,
  origin_port_id uuid references pl_ports(id), destination_port_id uuid references pl_ports(id), container_no text, seal_no text, etd date, eta date,
  status pl_status not null default 'draft', status_changed_at timestamptz not null default now(), status_changed_by uuid default auth.uid(), notes text,
  total_koli numeric not null default 0, total_weight_kg numeric not null default 0, total_volume_m3 numeric not null default 0, total_value numeric not null default 0, item_count integer not null default 0,
  created_by uuid default auth.uid(), updated_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.pl_items (id uuid primary key default gen_random_uuid(), packing_list_id uuid not null references pl_packing_lists(id) on delete cascade, line_no integer not null,
  name text not null check (char_length(trim(name)) between 1 and 200), qty numeric not null check (qty > 0), unit text not null check (unit in ('koli','kardus','karung','peti','pallet')),
  weight_kg numeric not null default 0 check (weight_kg >= 0), length_cm numeric, width_cm numeric, height_cm numeric, volume_m3 numeric not null default 0, value_idr numeric, notes text,
  condition text not null default 'baik' check (condition in ('baik','rusak_ringan','rusak_berat','basah','kurang')), created_at timestamptz not null default now());
create table public.pl_status_history (id uuid primary key default gen_random_uuid(), packing_list_id uuid not null references pl_packing_lists(id) on delete cascade,
  from_status pl_status, to_status pl_status not null, note text, changed_by uuid, changed_by_name text, changed_at timestamptz not null default now());
create table public.pl_activity_logs (id uuid primary key default gen_random_uuid(), packing_list_id uuid, entity text not null, entity_id uuid, action text not null, summary text not null,
  details jsonb, actor_id uuid, actor_name text, created_at timestamptz not null default now());

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "staff read pl_packing_lists" on public.pl_packing_lists for select to authenticated using (public.is_staff());
create policy "staff delete pl_packing_lists" on public.pl_packing_lists for delete to authenticated using (public.is_staff());
create policy "staff read pl_items" on public.pl_items for select to authenticated using (public.is_staff());
create policy "staff read pl_status_history" on public.pl_status_history for select to authenticated using (public.is_staff());
create policy "staff read pl_activity_logs" on public.pl_activity_logs for select to authenticated using (public.is_staff());
create policy "staff manage pl_parties" on public.pl_parties for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage pl_vessels" on public.pl_vessels for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage pl_ports" on public.pl_ports for all to authenticated using (public.is_staff()) with check (public.is_staff());
alter table public.pl_packing_lists enable row level security; alter table public.pl_items enable row level security;
alter table public.pl_status_history enable row level security; alter table public.pl_activity_logs enable row level security;
alter table public.pl_parties enable row level security; alter table public.pl_vessels enable row level security; alter table public.pl_ports enable row level security;

CREATE OR REPLACE FUNCTION public.pl_item_volume(p_qty numeric, p_l numeric, p_w numeric, p_h numeric, p_manual numeric) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  select case when coalesce(p_l,0) > 0 and coalesce(p_w,0) > 0 and coalesce(p_h,0) > 0
              then round(p_l * p_w * p_h / 1000000.0 * p_qty, 4)
              else round(greatest(coalesce(p_manual, 0), 0), 4) end
$function$;

CREATE OR REPLACE FUNCTION public.pl_actor_name() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select coalesce(nullif(trim(p.full_name), ''), nullif(p.email, ''), 'Pengguna') from public.profiles p where p.id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.pl_before_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare note text := nullif(trim(coalesce(current_setting('pl.status_note', true), '')), '');
begin
  if tg_op = 'INSERT' then
    if new.pl_number is null or char_length(trim(new.pl_number)) = 0 then
      new.pl_number := 'PL-' || to_char(coalesce(new.pl_date, current_date), 'YYYYMM') || '-' || lpad(nextval('public.pl_number_seq')::text, 5, '0');
    end if;
    new.status_changed_at := now();
    new.status_changed_by := auth.uid();
  elsif new.status is distinct from old.status then
    if new.status = 'dibatalkan' and (note is null or char_length(note) < 5) then
      raise exception 'Alasan pembatalan wajib diisi (minimal 5 karakter)';
    end if;
    new.status_changed_at := now();
    new.status_changed_by := auth.uid();
  else
    new.status_changed_at := old.status_changed_at;
    new.status_changed_by := old.status_changed_by;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.pl_after_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.pl_status_history (packing_list_id, from_status, to_status, note, changed_by, changed_by_name, changed_at)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status,
            nullif(trim(coalesce(current_setting('pl.status_note', true), '')), ''), auth.uid(), public.pl_actor_name(), new.status_changed_at);
  end if;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.pl_log_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare r jsonb; label text; act text; ent text; plid uuid;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  act := case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end;
  ent := case tg_table_name when 'pl_parties' then r->>'kind' when 'pl_vessels' then 'kapal' when 'pl_ports' then 'pelabuhan' else 'packing_list' end;
  label := coalesce(r->>'pl_number', r->>'name', '-');
  if tg_table_name = 'pl_packing_lists' then
    plid := (r->>'id')::uuid;
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and (to_jsonb(new) - array['status','status_changed_at','status_changed_by','updated_at','updated_by'])
         = (to_jsonb(old) - array['status','status_changed_at','status_changed_by','updated_at','updated_by']) then
      act := 'status';
    end if;
  end if;
  insert into public.pl_activity_logs (packing_list_id, entity, entity_id, action, summary, details, actor_id, actor_name)
  values (plid, ent, (r->>'id')::uuid, act, label,
          case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
               when tg_op = 'DELETE' then jsonb_build_object('before', to_jsonb(old))
               else jsonb_build_object('after', to_jsonb(new)) end
          || case when act = 'status' then jsonb_build_object('note', nullif(trim(coalesce(current_setting('pl.status_note', true), '')), '')) else '{}'::jsonb end,
          auth.uid(), public.pl_actor_name());
  return null;
end $function$;

create trigger trg_pl_lists_before before insert or update on public.pl_packing_lists for each row execute function public.pl_before_write();
create trigger trg_pl_lists_status after insert or update on public.pl_packing_lists for each row execute function public.pl_after_status();
create trigger trg_pl_lists_log after insert or update or delete on public.pl_packing_lists for each row execute function public.pl_log_activity();
create trigger trg_pl_parties_log after insert or update or delete on public.pl_parties for each row execute function public.pl_log_activity();
create trigger trg_pl_vessels_log after insert or update or delete on public.pl_vessels for each row execute function public.pl_log_activity();
create trigger trg_pl_ports_log after insert or update or delete on public.pl_ports for each row execute function public.pl_log_activity();

CREATE OR REPLACE FUNCTION public.save_packing_list(p_id uuid, p_header jsonb, p_items jsonb) RETURNS pl_packing_lists LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare rec public.pl_packing_lists; n int; t_koli numeric; t_w numeric; t_v numeric; t_val numeric;
begin
  if not public.is_staff() then raise exception 'Tidak memiliki akses Packing List'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Daftar barang tidak valid'; end if;
  n := jsonb_array_length(p_items);
  if n = 0 then raise exception 'Minimal satu barang wajib diisi'; end if;
  if n > 500 then raise exception 'Maksimal 500 barang per packing list'; end if;
  if nullif(p_header->>'shipper_id','') is null then raise exception 'Pengirim wajib dipilih'; end if;
  if nullif(p_header->>'consignee_id','') is null then raise exception 'Penerima wajib dipilih'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) i where char_length(trim(coalesce(i->>'name',''))) = 0) then raise exception 'Nama barang wajib diisi'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) i where coalesce((i->>'qty')::numeric, 0) <= 0) then raise exception 'Jumlah barang harus lebih dari 0'; end if;

  select coalesce(sum((i->>'qty')::numeric),0),
         coalesce(sum((i->>'qty')::numeric * coalesce(nullif(i->>'weight_kg','')::numeric,0)),0),
         coalesce(sum(public.pl_item_volume((i->>'qty')::numeric, nullif(i->>'length_cm','')::numeric, nullif(i->>'width_cm','')::numeric, nullif(i->>'height_cm','')::numeric, nullif(i->>'volume_m3','')::numeric)),0),
         coalesce(sum(coalesce(nullif(i->>'value_idr','')::numeric,0)),0)
    into t_koli, t_w, t_v, t_val
  from jsonb_array_elements(p_items) i;

  if p_id is null then
    insert into public.pl_packing_lists (pl_date, shipper_id, consignee_id, vessel_id, voyage_no, origin_port_id, destination_port_id,
      container_no, seal_no, etd, eta, notes, total_koli, total_weight_kg, total_volume_m3, total_value, item_count, created_by, updated_by)
    values (coalesce(nullif(p_header->>'pl_date','')::date, current_date), (p_header->>'shipper_id')::uuid, (p_header->>'consignee_id')::uuid,
      nullif(p_header->>'vessel_id','')::uuid, nullif(trim(coalesce(p_header->>'voyage_no','')),''), nullif(p_header->>'origin_port_id','')::uuid,
      nullif(p_header->>'destination_port_id','')::uuid, nullif(trim(coalesce(p_header->>'container_no','')),''), nullif(trim(coalesce(p_header->>'seal_no','')),''),
      nullif(p_header->>'etd','')::date, nullif(p_header->>'eta','')::date, nullif(trim(coalesce(p_header->>'notes','')),''),
      t_koli, round(t_w,2), round(t_v,4), round(t_val,2), n, auth.uid(), auth.uid())
    returning * into rec;
  else
    perform 1 from public.pl_packing_lists where id = p_id for update;
    if not found then raise exception 'Packing list tidak ditemukan'; end if;
    update public.pl_packing_lists set
      pl_date = coalesce(nullif(p_header->>'pl_date','')::date, pl_date), shipper_id = (p_header->>'shipper_id')::uuid, consignee_id = (p_header->>'consignee_id')::uuid,
      vessel_id = nullif(p_header->>'vessel_id','')::uuid, voyage_no = nullif(trim(coalesce(p_header->>'voyage_no','')),''),
      origin_port_id = nullif(p_header->>'origin_port_id','')::uuid, destination_port_id = nullif(p_header->>'destination_port_id','')::uuid,
      container_no = nullif(trim(coalesce(p_header->>'container_no','')),''), seal_no = nullif(trim(coalesce(p_header->>'seal_no','')),''),
      etd = nullif(p_header->>'etd','')::date, eta = nullif(p_header->>'eta','')::date, notes = nullif(trim(coalesce(p_header->>'notes','')),''),
      total_koli = t_koli, total_weight_kg = round(t_w,2), total_volume_m3 = round(t_v,4), total_value = round(t_val,2), item_count = n, updated_by = auth.uid()
    where id = p_id returning * into rec;
    delete from public.pl_items where packing_list_id = p_id;
  end if;

  insert into public.pl_items (packing_list_id, line_no, name, qty, unit, weight_kg, length_cm, width_cm, height_cm, volume_m3, value_idr, notes, condition)
  select rec.id, x.ord::int, left(trim(x.i->>'name'),200), (x.i->>'qty')::numeric, coalesce(nullif(x.i->>'unit',''),'koli'),
         round(coalesce(nullif(x.i->>'weight_kg','')::numeric,0),2), nullif(x.i->>'length_cm','')::numeric, nullif(x.i->>'width_cm','')::numeric, nullif(x.i->>'height_cm','')::numeric,
         public.pl_item_volume((x.i->>'qty')::numeric, nullif(x.i->>'length_cm','')::numeric, nullif(x.i->>'width_cm','')::numeric, nullif(x.i->>'height_cm','')::numeric, nullif(x.i->>'volume_m3','')::numeric),
         nullif(x.i->>'value_idr','')::numeric, nullif(left(trim(coalesce(x.i->>'notes','')),500),''), coalesce(nullif(x.i->>'condition',''),'baik')
  from jsonb_array_elements(p_items) with ordinality as x(i, ord);
  return rec;
end $function$;

CREATE OR REPLACE FUNCTION public.set_packing_list_status(p_id uuid, p_status pl_status, p_note text) RETURNS pl_packing_lists LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare rec public.pl_packing_lists;
begin
  if not public.is_staff() then raise exception 'Tidak memiliki akses Packing List'; end if;
  perform set_config('pl.status_note', left(coalesce(p_note,''), 500), true);
  update public.pl_packing_lists set status = p_status, updated_by = auth.uid() where id = p_id returning * into rec;
  if not found then raise exception 'Packing list tidak ditemukan'; end if;
  perform set_config('pl.status_note', '', true);
  return rec;
end $function$;
