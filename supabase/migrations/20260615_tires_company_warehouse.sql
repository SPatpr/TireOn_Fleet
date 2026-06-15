-- =============================================================
-- Raktárkezelés előfeltétele: company_id a tires táblán + RLS
--
-- Alkalmazva: 2026-06-15 (Supabase MCP-n keresztül,
--   migration neve: tires_company_warehouse)
--
-- Indok: a raktári (szabad) gumiknál vehicle_id IS NULL, így a
-- járművön keresztüli cég-szűrés nem működik. A tires táblának
-- saját company_id oszlopra van szüksége (multi-tenant).
--
-- Tényleges séma, amihez igazítottunk:
--   * companies.id / profiles.company_id  → INTEGER (nem uuid!)
--   * tires.status                        → tire_status ENUM
--                                           (mounted/stored/disposed/damaged)
--   * tires-en MÁR volt RLS + 4 policy, amelyek a járművön át
--     szűrtek → ezeket company_id alapúra ÍRJUK ÁT (nem újat adunk).
--
-- A BEFORE INSERT trigger automatikusan kitölti a company_id-t
-- (a járműből, vagy a beszúró user profiljából), így a meglévő
-- addNewTire / updateTireData hívások VÁLTOZTATÁS NÉLKÜL működnek.
-- =============================================================

-- 1) Oszlop (INTEGER FK a companies.id-ra)
alter table public.tires
  add column if not exists company_id integer references public.companies(id);

-- 2) A raktári gumiknál nincs pozíció → engedjük a NULL-t
alter table public.tires alter column position drop not null;

-- 3) Meglévő (felszerelt) gumik company_id-jának visszatöltése a járműből
update public.tires t
   set company_id = v.company_id
  from public.vehicles v
 where t.vehicle_id = v.id
   and t.company_id is null;

-- 4) Segédfüggvény: a bejelentkezett user cége (INTEGER)
create or replace function public.current_company_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- 5) Trigger: INSERT-kor automatikusan kitölti a company_id-t,
--    ha a kliens nem adta meg (a járműből vagy a user profiljából)
create or replace function public.set_tire_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    if new.vehicle_id is not null then
      select company_id into new.company_id
        from public.vehicles where id = new.vehicle_id;
    end if;
    if new.company_id is null then
      select company_id into new.company_id
        from public.profiles where id = auth.uid();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_tire_company on public.tires;
create trigger trg_set_tire_company
  before insert on public.tires
  for each row execute function public.set_tire_company_id();

-- 6) Index a cég + raktár szűréshez
create index if not exists tires_company_vehicle_idx
  on public.tires (company_id, vehicle_id);

-- 7) A MEGLÉVŐ 4 RLS policy átírása company_id alapúra
--    (a vehicle-join helyett; a szerepkör-logika változatlan marad,
--     így a raktári vehicle_id IS NULL gumik is láthatók/kezelhetők)

drop policy if exists "Cégtagok láthatják a gumikat" on public.tires;
create policy "Cégtagok láthatják a gumikat"
  on public.tires for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Adminok és managerek adhatnak hozzá gumikat" on public.tires;
create policy "Adminok és managerek adhatnak hozzá gumikat"
  on public.tires for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['admin'::user_role, 'manager'::user_role])
    )
  );

drop policy if exists "Adminok és managerek frissíthetik a gumikat" on public.tires;
create policy "Adminok és managerek frissíthetik a gumikat"
  on public.tires for update to authenticated
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['admin'::user_role, 'manager'::user_role])
    )
  )
  with check (company_id = public.current_company_id());

drop policy if exists "Csak adminok törölhetnek gumikat" on public.tires;
create policy "Csak adminok törölhetnek gumikat"
  on public.tires for delete to authenticated
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'::user_role
    )
  );
