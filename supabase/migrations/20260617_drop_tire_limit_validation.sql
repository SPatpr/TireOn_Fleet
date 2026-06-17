-- =============================================================
-- A DB-alapú, per-járműtípus gumiabroncs-határérték validáció
-- kivezetése.
--
-- Alkalmazva: 2026-06-17 (Supabase MCP, migration: drop_tire_limit_validation)
--
-- A határértékek mostantól fejlesztői konfigurációból
-- (constants/tireConfig.js) jönnek, KIZÁRÓLAG színezésre – nem
-- blokkolják a mentést/felszerelést.
--
-- Egyúttal javítja a hibát: a raktárból felszerelt kerék UPDATE-jét
-- a trigger elutasította, ha a kerék nyomása/profilja kívül esett a
-- típus-tartományon (pl. 10.5 bar > truck max 9.5 bar) → a kerék nem
-- ugrott be a pozícióra.
--
-- A set_tire_company_id trigger MEGMARAD (company_id automatikus kitöltés).
-- A tire_specs tábla dormant marad (nincs rá több hivatkozás).
-- =============================================================

drop trigger if exists trg_validate_tire_limits on public.tires;
drop function if exists public.validate_tire_limits();
