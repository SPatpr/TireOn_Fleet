-- =============================================================
-- test_logs: tesztkörnyezeti hibajelentés / log gyűjtő tábla.
--
-- Alkalmazva: 2026-06-15 (Supabase MCP, migration: test_logs_feedback)
--
-- A preview (teszt) csatornán futó app ide küldi a crasheket és a
-- kritikus logokat (lib/logger.js), hogy folyamatosan lássuk a
-- tesztelők hibáit. Ideálisan a DEDIKÁLT teszt-adatbázisban él;
-- ugyanezt a migrációt kell lefuttatni azon a projekten is.
-- =============================================================

create table if not exists public.test_logs (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users(id) on delete set null,
  device_info   jsonb,
  error_message text,
  level         text not null default 'error',     -- 'error' | 'fatal' | 'info'
  context       jsonb,                              -- tetszőleges kiegészítő adat
  app_channel   text,                               -- pl. 'preview'
  "timestamp"   timestamptz not null default now()
);

create index if not exists test_logs_timestamp_idx on public.test_logs ("timestamp" desc);

alter table public.test_logs enable row level security;

-- Tesztkörnyezet: bárki (bejelentkezett vagy anon tesztelő) beszúrhat logot.
drop policy if exists "test_logs_insert_any" on public.test_logs;
create policy "test_logs_insert_any"
  on public.test_logs for insert to anon, authenticated
  with check (true);

-- SELECT policy szándékosan NINCS → a logokat csak a Supabase
-- dashboard / service_role olvashatja.
