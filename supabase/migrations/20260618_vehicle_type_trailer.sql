-- =============================================================
-- 'trailer' érték felvétele a vehicle_type enumba.
--
-- Alkalmazva: 2026-06-18 (Supabase MCP)
--
-- A jármű-hozzáadó űrlap kisbetűs 'truck' / 'trailer' / 'car'
-- értékeket küld. Az enumban eddig csak trailer_1/2/3 volt (a 'trailer'
-- hiányzott), így a 'trailer' INSERT érvénytelen enum-értékre futott.
-- (A korábbi mentési bug fő oka egyébként az érvénytelen 'tractor'
--  alapérték volt az űrlapon – az most 'truck'-ra javítva a kliensen.)
-- =============================================================

alter type public.vehicle_type add value if not exists 'trailer';
