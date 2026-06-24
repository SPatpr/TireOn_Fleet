-- =============================================================
-- tire-scans: PRIVÁT bucket az OCR-hez feltöltött gumifal-fotóknak.
--
-- Alkalmazva: 2026-06-18 (Supabase MCP, migration: tire_scans_bucket)
--
-- A felhasználó csak a SAJÁT mappájába (${user.id}/...) írhat/olvashat/törölhet.
-- Az ocr-tire-serial Edge Function service-role kulccsal éri el (RLS nélkül).
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tire-scans', 'tire-scans', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "tire_scans_insert_own" on storage.objects;
create policy "tire_scans_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tire-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tire_scans_select_own" on storage.objects;
create policy "tire_scans_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'tire-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tire_scans_delete_own" on storage.objects;
create policy "tire_scans_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tire-scans' and (storage.foldername(name))[1] = auth.uid()::text);
