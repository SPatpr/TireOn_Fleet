-- =============================================================
-- Tulajdonosi (owner) szerepkör + jogosultság-mátrix + globális beállítások
--
-- Alkalmazva: 2026-06-15 (Supabase MCP, migration: company_settings_and_owner)
--
-- FONTOS: az enum-bővítést KÜLÖN, a tábla előtt kell futtatni, mert a
-- PostgreSQL nem engedi az új enum-értéket ugyanabban a tranzakcióban
-- felhasználni, amelyben hozzáadtuk. (MCP-n külön hívásként futott.)
-- =============================================================

alter type public.user_role add value if not exists 'owner';

-- -------------------------------------------------------------
-- company_settings: cégenként 1 sor; csak az 'owner' írhatja
-- -------------------------------------------------------------
create table if not exists public.company_settings (
  id                         serial primary key,
  company_id                 integer not null unique references public.companies(id) on delete cascade,
  manager_can_edit_drivers   boolean not null default true,
  admin_can_add_vehicle      boolean not null default true,
  drivers_can_view_warehouse boolean not null default false,
  updated_at                 timestamptz not null default now()
);

-- Alap sor minden meglévő cégnek
insert into public.company_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

-- Segédfüggvény: a bejelentkezett user tulajdonos-e
create or replace function public.is_company_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'::user_role
  );
$$;

-- RLS: olvasás cégtagoknak, írás KIZÁRÓLAG owner
alter table public.company_settings enable row level security;

drop policy if exists "company_settings_select_own" on public.company_settings;
create policy "company_settings_select_own"
  on public.company_settings for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "company_settings_owner_write" on public.company_settings;
create policy "company_settings_owner_write"
  on public.company_settings for all to authenticated
  using (company_id = public.current_company_id() and public.is_company_owner())
  with check (company_id = public.current_company_id() and public.is_company_owner());

-- -------------------------------------------------------------
-- A gumi-határértékeket mostantól az owner is kezelheti
-- (a kezelőfelület a Tulajdonosi oldalra került)
-- -------------------------------------------------------------
drop policy if exists "tire_specs_write_admin_manager" on public.tire_specs;
create policy "tire_specs_write_admin_manager"
  on public.tire_specs for all to authenticated
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  )
  with check (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  );
