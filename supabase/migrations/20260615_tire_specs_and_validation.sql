-- =============================================================
-- Járműtípus-specifikus gumiabroncs-határértékek + szerveroldali
-- validáció.
--
-- Alkalmazva: 2026-06-15 (Supabase MCP, migration: tire_specs_and_validation)
--
-- A tire_specs tárolja cégenként és vehicle_type-onként a megengedett
-- min/max nyomást (bar) és profilmélységet (mm). A tires táblán egy
-- BEFORE INSERT/UPDATE trigger ezekből a limitekből validál; raktári
-- (vehicle_id IS NULL) keréknél abszolút alapértékek (0-10.5 bar, 0-25 mm).
--
-- Trigger-sorrend (név szerint, INSERT-nél):
--   trg_set_tire_company  → kitölti a company_id-t
--   trg_validate_tire_limits → ezután validál (a company_id már kész)
-- =============================================================

create table if not exists public.tire_specs (
  id           serial primary key,
  company_id   integer not null references public.companies(id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  min_bar      numeric(4,2) not null default 0,
  max_bar      numeric(4,2) not null default 10.5,
  min_mm       numeric(4,2) not null default 0,
  max_mm       numeric(4,2) not null default 25,
  updated_at   timestamptz not null default now(),
  unique (company_id, vehicle_type),
  check (max_bar >= min_bar),
  check (max_mm  >= min_mm)
);

-- Alapértelmezett határértékek minden meglévő cég × járműtípus párra
insert into public.tire_specs (company_id, vehicle_type, min_bar, max_bar, min_mm, max_mm)
select c.id, vt,
  case when vt = 'car' then 2.0 else 6.0 end,
  case when vt = 'car' then 3.5 else 9.5 end,
  case when vt = 'car' then 1.6 else 3.0 end,
  case when vt = 'car' then 12  else 25  end
from public.companies c
cross join unnest(enum_range(null::public.vehicle_type)) as vt
on conflict (company_id, vehicle_type) do nothing;

-- RLS – cég-szintű elérés
alter table public.tire_specs enable row level security;

drop policy if exists "tire_specs_select_own" on public.tire_specs;
create policy "tire_specs_select_own"
  on public.tire_specs for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "tire_specs_write_admin_manager" on public.tire_specs;
create policy "tire_specs_write_admin_manager"
  on public.tire_specs for all to authenticated
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['admin'::user_role, 'manager'::user_role]))
  )
  with check (
    company_id = public.current_company_id()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = any (array['admin'::user_role, 'manager'::user_role]))
  );

-- Szerveroldali validációs trigger a tires táblán
create or replace function public.validate_tire_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vt      public.vehicle_type;
  lo_bar  numeric := 0;
  hi_bar  numeric := 10.5;
  lo_mm   numeric := 0;
  hi_mm   numeric := 25;
  rec     public.tire_specs;
begin
  if new.vehicle_id is not null then
    select type into vt from public.vehicles where id = new.vehicle_id;
    if vt is not null then
      select * into rec from public.tire_specs
        where company_id = new.company_id and vehicle_type = vt;
      if found then
        lo_bar := rec.min_bar; hi_bar := rec.max_bar;
        lo_mm  := rec.min_mm;  hi_mm  := rec.max_mm;
      end if;
    end if;
  end if;

  if new.current_bar is not null and (new.current_bar < lo_bar or new.current_bar > hi_bar) then
    raise exception 'Hiba: A nyomás % és % bar között lehet (megadott: % bar).', lo_bar, hi_bar, new.current_bar
      using errcode = 'check_violation';
  end if;

  if new.current_mm is not null and (new.current_mm < lo_mm or new.current_mm > hi_mm) then
    raise exception 'Hiba: A profilmélység % és % mm között lehet (megadott: % mm).', lo_mm, hi_mm, new.current_mm
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_tire_limits on public.tires;
create trigger trg_validate_tire_limits
  before insert or update on public.tires
  for each row execute function public.validate_tire_limits();
