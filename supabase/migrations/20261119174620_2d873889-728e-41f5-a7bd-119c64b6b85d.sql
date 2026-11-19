create or replace function public.admin_delete_user(_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
  v_name text;
  v_role public.app_role;
begin
  perform public._require_super_admin();
  if _user_id = auth.uid() then
    raise exception 'Anda tidak dapat menghapus akun sendiri' using errcode = '42501';
  end if;
  select u.email, coalesce(p.full_name, '') into v_email, v_name
    from auth.users u left join public.profiles p on p.id = u.id where u.id = _user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  select r.role into v_role from public.user_roles r where r.user_id = _user_id;

  -- Refresh tokens are not linked by foreign key; everything else (sessions, identities,
  -- profile, role) cascades from auth.users. Bookkeeping and Packing List rows stay.
  delete from auth.refresh_tokens t where t.user_id = _user_id::text;
  delete from auth.users u where u.id = _user_id;

  perform public._audit_account('user_delete', _user_id,
    jsonb_build_object('email', v_email, 'full_name', v_name, 'role', v_role), null);
end $$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;