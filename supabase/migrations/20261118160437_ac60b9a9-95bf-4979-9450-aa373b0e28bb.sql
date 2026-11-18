-- Four-role access: super_admin (everything), admin1/admin2 (own bookkeeping ledger),
-- admin_packing (Packing List module only). Account management is Super Admin only.

-- 1. One role per account, plus an account on/off switch that role checks honour.
alter table public.user_roles add column if not exists disabled_at timestamptz;
create unique index if not exists user_roles_one_role_per_user on public.user_roles (user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role and disabled_at is null)
$$;

create or replace function public.current_ledger()
returns public.ledger language sql stable security definer set search_path = public as $$
  select case role when 'admin1' then 'admin1'::public.ledger when 'admin2' then 'admin2'::public.ledger end
  from public.user_roles where user_id = auth.uid() and disabled_at is null
$$;

-- Packing List module access (all pl_* policies and RPCs use this).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin', 'admin_packing') and disabled_at is null)
$$;
comment on function public.is_staff() is 'Packing List module access: active Super Admin or Admin Packing List.';

-- 2. Shared helpers (not callable through the API).
create or replace function public._require_super_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Hanya Super Admin yang dapat mengelola akun' using errcode = '42501';
  end if;
end $$;

create or replace function public._role_label(_role public.app_role)
returns text language sql immutable set search_path = public as $$
  select case _role when 'super_admin' then 'Super Admin' when 'admin1' then 'Admin Laporan 1'
    when 'admin2' then 'Admin Laporan 2' when 'admin_packing' then 'Admin Packing List' end
$$;

create or replace function public._audit_account(_action text, _target uuid, _before jsonb, _after jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, before_data, after_data, result)
  values (auth.uid(), _action, _before, coalesce(_after, '{}'::jsonb) || jsonb_build_object('user_id', _target), 'success')
$$;

revoke execute on function public._require_super_admin() from public, anon, authenticated;
revoke execute on function public._audit_account(text, uuid, jsonb, jsonb) from public, anon, authenticated;

-- 3. Create: Super Admin only; Admin Laporan 1 / 2 stay one account each.
create or replace function public.admin_create_user(_email text, _password text, _full_name text, _role public.app_role)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public._require_super_admin();
  if _role in ('admin1', 'admin2') and exists (select 1 from public.user_roles where role = _role) then
    raise exception 'Akun untuk % sudah ada', public._role_label(_role) using errcode = '23505';
  end if;
  v_id := public._create_staff_account(_email, _password, _full_name, _role);
  perform public._audit_account('user_create', v_id, null,
    jsonb_build_object('email', lower(trim(_email)), 'full_name', trim(_full_name), 'role', _role));
  return v_id;
end $$;

-- 4. List accounts with role and status.
create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role public.app_role, active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  perform public._require_super_admin();
  return query
    select u.id, u.email::text, coalesce(p.full_name, ''), r.role,
      (r.disabled_at is null and (u.banned_until is null or u.banned_until <= now())),
      u.last_sign_in_at, u.created_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.user_roles r on r.user_id = u.id
    order by u.created_at;
end $$;

-- 5. Edit name, email and role.
create or replace function public.admin_update_user(_user_id uuid, _full_name text, _email text, _role public.app_role)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := lower(trim(coalesce(_email, '')));
  v_name text := left(trim(coalesce(_full_name, '')), 80);
  old_role public.app_role;
  old_email text;
  old_name text;
begin
  perform public._require_super_admin();
  select u.email, coalesce(p.full_name, '') into old_email, old_name from auth.users u left join public.profiles p on p.id = u.id where u.id = _user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  select r.role into old_role from public.user_roles r where r.user_id = _user_id;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 200 then
    raise exception 'Email tidak valid' using errcode = '22023';
  end if;
  if v_name = '' then raise exception 'Nama wajib diisi' using errcode = '22023'; end if;
  if _role is null then raise exception 'Peran tidak valid' using errcode = '22023'; end if;
  if _user_id = auth.uid() and _role is distinct from old_role then
    raise exception 'Anda tidak dapat mengubah peran akun sendiri' using errcode = '42501';
  end if;
  if _role in ('admin1', 'admin2') and exists (select 1 from public.user_roles r where r.role = _role and r.user_id <> _user_id) then
    raise exception 'Akun untuk % sudah ada', public._role_label(_role) using errcode = '23505';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> _user_id) then
    raise exception 'Email sudah terdaftar' using errcode = '23505';
  end if;

  if v_email is distinct from lower(old_email) then
    update auth.users set email = v_email, updated_at = now() where id = _user_id;
    update auth.identities set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
      where user_id = _user_id and provider = 'email';
  end if;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', v_name), updated_at = now()
    where id = _user_id;
  insert into public.profiles (id, full_name, email) values (_user_id, v_name, v_email)
    on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  insert into public.user_roles (user_id, role) values (_user_id, _role)
    on conflict (user_id) do update set role = excluded.role;

  perform public._audit_account('user_update', _user_id,
    jsonb_build_object('email', old_email, 'full_name', old_name, 'role', old_role),
    jsonb_build_object('email', v_email, 'full_name', v_name, 'role', _role));
end $$;

-- 6. Deactivate / activate (blocks sign-in and ends open sessions).
create or replace function public.admin_set_user_active(_user_id uuid, _active boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  perform public._require_super_admin();
  if not exists (select 1 from auth.users u where u.id = _user_id) then raise exception 'Akun tidak ditemukan'; end if;
  if _user_id = auth.uid() and not _active then
    raise exception 'Anda tidak dapat menonaktifkan akun sendiri' using errcode = '42501';
  end if;
  update public.user_roles r set disabled_at = case when _active then null else coalesce(r.disabled_at, now()) end where r.user_id = _user_id;
  update auth.users u set banned_until = case when _active then null else now() + interval '100 years' end, updated_at = now() where u.id = _user_id;
  if not _active then
    delete from auth.refresh_tokens t where t.user_id = _user_id::text;
    delete from auth.sessions s where s.user_id = _user_id;
  end if;
  perform public._audit_account(case when _active then 'user_enable' else 'user_disable' end, _user_id, null, null);
end $$;

-- 7. Reset password (the password itself is never logged).
create or replace function public.admin_reset_password(_user_id uuid, _password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  perform public._require_super_admin();
  if length(coalesce(_password, '')) < 10 or length(_password) > 72 then
    raise exception 'Password minimal 10 karakter' using errcode = '22023';
  end if;
  update auth.users u set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf', 10)), updated_at = now()
    where u.id = _user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  if _user_id <> auth.uid() then
    delete from auth.refresh_tokens t where t.user_id = _user_id::text;
    delete from auth.sessions s where s.user_id = _user_id;
  end if;
  perform public._audit_account('user_reset_password', _user_id, null, null);
end $$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_update_user(uuid, text, text, public.app_role) from public, anon;
revoke execute on function public.admin_set_user_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_reset_password(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, public.app_role) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
