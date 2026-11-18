-- Packing List: all staff share view/create/edit; only Super Admin may delete.
drop policy if exists "staff delete pl_packing_lists" on public.pl_packing_lists;
drop policy if exists "super admin delete pl_packing_lists" on public.pl_packing_lists;
create policy "super admin delete pl_packing_lists" on public.pl_packing_lists
  for delete to authenticated using (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "staff manage pl_parties" on public.pl_parties;
create policy "staff read pl_parties" on public.pl_parties for select to authenticated using (public.is_staff());
create policy "staff insert pl_parties" on public.pl_parties for insert to authenticated with check (public.is_staff());
create policy "staff update pl_parties" on public.pl_parties for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "super admin delete pl_parties" on public.pl_parties for delete to authenticated using (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "staff manage pl_vessels" on public.pl_vessels;
create policy "staff read pl_vessels" on public.pl_vessels for select to authenticated using (public.is_staff());
create policy "staff insert pl_vessels" on public.pl_vessels for insert to authenticated with check (public.is_staff());
create policy "staff update pl_vessels" on public.pl_vessels for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "super admin delete pl_vessels" on public.pl_vessels for delete to authenticated using (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "staff manage pl_ports" on public.pl_ports;
create policy "staff read pl_ports" on public.pl_ports for select to authenticated using (public.is_staff());
create policy "staff insert pl_ports" on public.pl_ports for insert to authenticated with check (public.is_staff());
create policy "staff update pl_ports" on public.pl_ports for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "super admin delete pl_ports" on public.pl_ports for delete to authenticated using (public.has_role(auth.uid(), 'super_admin'));

-- Live dashboard refresh for Packing List changes (RLS still filters subscribers).
do $$
declare t text;
begin
  foreach t in array array['pl_packing_lists','pl_parties','pl_vessels','pl_ports','pl_activity_logs'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;