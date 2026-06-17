-- =============================================================
-- Az 'owner' szerep felvétele a write-policy-kbe.
--
-- Alkalmazva: 2026-06-17 (Supabase MCP, migration: add_owner_to_write_policies)
--
-- Ok: a tires/vehicles/profiles write-policy-k az 'owner' enum-érték
-- LÉTREHOZÁSA ELŐTT készültek, ezért csak admin/manager-t engedtek.
-- Egy owner felhasználó így minden írásból ki volt zárva:
--   • tires UPDATE/INSERT → "new row violates RLS" / 0 sor
--     ("Cannot coerce the result to a single JSON object")
--   • a raktári kerék felszerelése és a kerékadat-mentés elhasalt.
-- Az owner mostantól a cégvezetés szuperszerepe (admin ⊆ owner).
-- =============================================================

-- ---------- TIRES ----------
drop policy if exists "Adminok és managerek adhatnak hozzá gumikat" on public.tires;
create policy "Adminok és managerek adhatnak hozzá gumikat"
  on public.tires for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  );

drop policy if exists "Adminok és managerek frissíthetik a gumikat" on public.tires;
create policy "Adminok és managerek frissíthetik a gumikat"
  on public.tires for update to authenticated
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  )
  with check (company_id = public.current_company_id());

drop policy if exists "Csak adminok törölhetnek gumikat" on public.tires;
create policy "Csak adminok törölhetnek gumikat"
  on public.tires for delete to authenticated
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['owner'::user_role, 'admin'::user_role]))
  );

-- ---------- VEHICLES ----------
drop policy if exists "Admins can insert vehicles" on public.vehicles;
create policy "Admins can insert vehicles"
  on public.vehicles for insert to authenticated
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.company_id = vehicles.company_id
              and p.role = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  );

drop policy if exists "Adminok és managerek frissíthetik a járművet" on public.vehicles;
create policy "Adminok és managerek frissíthetik a járművet"
  on public.vehicles for update to authenticated
  using (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and company_id = public.get_my_company_id()
  )
  with check (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and company_id = public.get_my_company_id()
  );

drop policy if exists "Adminok törölhetnek járművet" on public.vehicles;
create policy "Adminok törölhetnek járművet"
  on public.vehicles for delete to authenticated
  using (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role])
    and company_id = public.get_my_company_id()
  );

-- ---------- PROFILES ----------
drop policy if exists "Admin és Menedzser csak a saját cégét szerkesztheti" on public.profiles;
create policy "Admin és Menedzser csak a saját cégét szerkesztheti"
  on public.profiles for update to authenticated
  using (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and public.get_my_company_id() = company_id
  )
  with check (
    public.get_my_role() = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
    and public.get_my_company_id() = company_id
  );
