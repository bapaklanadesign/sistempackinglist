revoke execute on function public.has_role(uuid, public.app_role), public.current_ledger(), public.handle_new_user() from public, anon;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.has_role(uuid, public.app_role), public.current_ledger() to authenticated;