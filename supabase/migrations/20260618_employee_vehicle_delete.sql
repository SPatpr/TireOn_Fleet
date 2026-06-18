-- =============================================================
-- Alkalmazott- és jármű-törlés biztonságos támogatása.
--
-- Alkalmazva: 2026-06-18 (Supabase MCP, migration: employee_vehicle_delete_support)
--
-- 1) Audit-FK-k ON DELETE SET NULL-ra: profil törlésekor a "ki végezte"
--    mezők NULL-ra állnak (nem blokkolják a törlést). A driver_vehicles
--    .profile_id már CASCADE; a járműre minden FK CASCADE.
-- 2) profiles DELETE policy: owner/admin/manager a SAJÁT cégében, de
--    saját magát nem törölheti.
-- 3) vehicles DELETE policy owner/admin/manager-re kiterjesztve.
-- =============================================================

alter table public.inspections
  drop constraint if exists inspections_user_id_fkey,
  add  constraint inspections_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.tire_history
  drop constraint if exists tire_history_performed_by_fkey,
  add  constraint tire_history_performed_by_fkey
       foreign key (performed_by) references public.profiles(id) on delete set null;

alter table public.pending_invitations
  drop constraint if exists pending_invitations_invited_by_fkey,
  add  constraint pending_invitations_invited_by_fkey
       foreign key (invited_by) references public.profiles(id) on delete set null;

drop policy if exists "profiles_delete_management" on public.profiles;
create policy "profiles_delete_management"
  on public.profiles for delete to authenticated
  using (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and company_id = public.get_my_company_id()
    and id <> auth.uid()
  );

drop policy if exists "Adminok törölhetnek járművet" on public.vehicles;
create policy "Adminok törölhetnek járművet"
  on public.vehicles for delete to authenticated
  using (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and company_id = public.get_my_company_id()
  );
