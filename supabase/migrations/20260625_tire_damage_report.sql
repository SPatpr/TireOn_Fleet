-- =============================================================
-- Sérülés-jelentés a gumikhoz.
--
-- Alkalmazva: 2026-06-25 (Supabase MCP, migration: tire_damage_report)
--
-- has_damage + damage_image_url a tires sorában, és egy dedikált,
-- PUBLIKUS tire-damages bucket a sérülés-fotóknak (stabil publicUrl).
-- Feltöltés csak a saját mappába; olvasás publikus.
-- =============================================================

alter table public.tires
  add column if not exists has_damage boolean not null default false,
  add column if not exists damage_image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tire-damages', 'tire-damages', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "tire_damages_insert_own" on storage.objects;
create policy "tire_damages_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tire-damages' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tire_damages_delete_own" on storage.objects;
create policy "tire_damages_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tire-damages' and (storage.foldername(name))[1] = auth.uid()::text);
