-- =============================================================
-- axle_count: a pótkocsik tengelyszáma (1, 2 vagy 3).
--
-- Alkalmazva: 2026-06-18 (Supabase MCP)
--
-- Kamionnál / autónál NULL marad. A diagnosztikai blueprint és a
-- kerékpozíciók (T1_L, T2_L, T3_R ...) ez alapján generálódnak.
-- =============================================================

alter table public.vehicles
  add column if not exists axle_count smallint
  check (axle_count is null or axle_count between 1 and 3);
