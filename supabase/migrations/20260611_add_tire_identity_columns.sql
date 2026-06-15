-- =============================================================
-- Gumi identitás oszlopok – CSAK a valóban hiányzó mezők
-- (brand, model, serial_number, size és tire_history már
--  létezett az adatbázisban, ezért azokat ez a migráció
--  nem érinti)
--
-- Alkalmazva: 2026-06-11 (Supabase MCP-n keresztül)
-- =============================================================

ALTER TABLE public.tires
  ADD COLUMN IF NOT EXISTS dot_number  varchar,
  ADD COLUMN IF NOT EXISTS barcode     varchar,
  ADD COLUMN IF NOT EXISTS photo_url   varchar;

-- =============================================================
-- Supabase Storage: tire-photos vödör
-- (ha még nem létezik – Dashboard-on is létrehozható)
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tire-photos',
  'tire-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Meglévő tire_history tábla tényleges sémája (referenciaként):
-- id              int4 identity
-- tire_id         int4  → tires.id
-- vehicle_id      int4  → vehicles.id
-- action          varchar  (pl. 'registered', 'mounted', 'photo_added')
-- old_position    varchar
-- new_position    varchar
-- odometer_at_event    int4
-- tire_total_km_at_event int4
-- performed_by    uuid  → profiles.id
-- event_date      timestamp
-- notes           text
