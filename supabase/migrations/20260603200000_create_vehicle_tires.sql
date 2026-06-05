create table if not exists public.vehicle_tires (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  position    text not null,
  pressure    numeric(5, 2),
  status      text check (status in ('good', 'warning', 'critical')),
  updated_at  timestamptz not null default now(),
  unique (vehicle_id, position)
);

alter table public.vehicle_tires enable row level security;

-- Csak a saját céghez tartozó járművek kerekeinek adatait lehet olvasni/módosítani
create policy "Cég tagjai olvashatják a saját jármű kerekeket"
  on public.vehicle_tires for select
  using (
    exists (
      select 1 from public.vehicles v
      join public.profiles p on p.company_id = v.company_id
      where v.id = vehicle_tires.vehicle_id
        and p.id = auth.uid()
    )
  );

create policy "Admin/menedzser módosíthatja a kerék adatokat"
  on public.vehicle_tires for all
  using (
    exists (
      select 1 from public.vehicles v
      join public.profiles p on p.company_id = v.company_id
      where v.id = vehicle_tires.vehicle_id
        and p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );
