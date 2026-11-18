-- Account administration that previously ran in server functions with the
-- service-role key. Static (SPA) hosting has no server, so the same rules run
-- here as SECURITY DEFINER functions; the browser only ever uses the publishable key.

create or replace function public._create_staff_account(_email text, _password text, _full_name text, _role public.app_role)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_email text := lower(trim(coalesce(_email, '')));
  v_name text := left(trim(coalesce(_full_name, '')), 80);
  v_id uuid := gen_random_uuid();
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 200 then
    raise exception 'Email tidak valid' using errcode = '22023';
  end if;
  if length(coalesce(_password, '')) < 10 or length(_password) > 72 then
    raise exception 'Password minimal 10 karakter' using errcode = '22023';
  end if;
  if v_name = '' then
    raise exception 'Nama wajib diisi' using errcode = '22023';
  end if;
  if _role is null then
    raise exception 'Peran tidak valid' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Email sudah terdaftar' using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(_password, extensions.gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', v_name), now(), now(),
    '', '', '', '', '', '', '', '',
    false, false
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, full_name, email) values (v_id, v_name, v_email)
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

  insert into public.user_roles (user_id, role) values (v_id, _role);
  return v_id;
end $$;

revoke execute on function public._create_staff_account(text, text, text, public.app_role) from public, anon, authenticated;

-- Super Admin creates an account and assigns its role (Admin 1 / Admin 2 stay one account each).
create or replace function public.admin_create_user(_email text, _password text, _full_name text, _role public.app_role)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Hanya Super Admin yang dapat membuat akun' using errcode = '42501';
  end if;
  if _role <> 'super_admin' and exists (select 1 from public.user_roles where role = _role) then
    raise exception 'Akun untuk % sudah ada', case when _role = 'admin1' then 'Admin 1' else 'Admin 2' end using errcode = '23505';
  end if;
  return public._create_staff_account(_email, _password, _full_name, _role);
end $$;

revoke execute on function public.admin_create_user(text, text, text, public.app_role) from public, anon;
grant execute on function public.admin_create_user(text, text, text, public.app_role) to authenticated;

-- Whether the one-time initial Super Admin setup is still open (yes/no only).
create or replace function public.setup_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.user_roles where role = 'super_admin')
$$;

revoke execute on function public.setup_status() from public;
grant execute on function public.setup_status() to anon, authenticated;

-- One-time bootstrap: creates the first Super Admin only while none exists.
create or replace function public.bootstrap_super_admin(_email text, _password text, _full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.bootstrap_super_admin'));
  if exists (select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'Super Admin sudah dibuat. Penyiapan awal ditutup.' using errcode = '42501';
  end if;
  return public._create_staff_account(_email, _password, _full_name, 'super_admin');
end $$;

revoke execute on function public.bootstrap_super_admin(text, text, text) from public;
grant execute on function public.bootstrap_super_admin(text, text, text) to anon, authenticated;
