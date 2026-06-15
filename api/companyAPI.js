// =============================================================
// Cég-szintű beállítások (company_settings) API-ja.
//
// A jogosultság-mátrixot (ki mit csinálhat) és a globális
// kapcsolókat tárolja. Olvasni minden cégtag tud (a kliens ez
// alapján rejti/mutatja a gombokat), ÍRNI viszont kizárólag az
// 'owner' szerepkör (a Supabase RLS kényszeríti ki).
// =============================================================

import { DEFAULT_COMPANY_SETTINGS } from "../lib/permissions";
import { supabase } from "../lib/supabase";

const resolveCompanyId = async (companyId) => {
  if (companyId) return companyId;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (error || !profile?.company_id)
    throw new Error("Nincs cég rendelve ehhez a fiókhoz!");
  return profile.company_id;
};

// A cég beállításainak beolvasása (hiány esetén az alapértékek)
export const getCompanySettings = async (companyId = null) => {
  try {
    const cid = await resolveCompanyId(companyId);
    const { data, error } = await supabase
      .from("company_settings")
      .select("company_id, manager_can_edit_drivers, admin_can_add_vehicle, drivers_can_view_warehouse")
      .eq("company_id", cid)
      .maybeSingle();

    if (error) throw error;
    return { ...DEFAULT_COMPANY_SETTINGS, ...(data ?? {}) };
  } catch (error) {
    console.error("getCompanySettings Error:", error.message);
    // Biztonságos visszaesés: a legszigorúbb (alap) beállítások
    return DEFAULT_COMPANY_SETTINGS;
  }
};

// Admin Központ darabszámok – szigorúan a saját cég adataira szűrve.
// A head:true + count:'exact' csak a darabszámot kéri le (gyors).
export const getAdminCounts = async (companyId = null) => {
  try {
    const cid = await resolveCompanyId(companyId);

    const countOf = async (builderFn) => {
      const { count, error } = await builderFn();
      if (error) throw error;
      return count ?? 0;
    };

    const [vehicles, warehouse, drivers, management] = await Promise.all([
      countOf(() =>
        supabase.from("vehicles").select("id", { count: "exact", head: true })
          .eq("company_id", cid)),
      countOf(() =>
        supabase.from("tires").select("id", { count: "exact", head: true })
          .eq("company_id", cid).is("vehicle_id", null)),
      countOf(() =>
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .eq("company_id", cid).eq("role", "driver")),
      countOf(() =>
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .eq("company_id", cid).in("role", ["owner", "admin", "manager"])),
    ]);

    return { vehicles, warehouse, drivers, management };
  } catch (error) {
    console.error("getAdminCounts Error:", error.message);
    return { vehicles: 0, warehouse: 0, drivers: 0, management: 0 };
  }
};

// Beállítások mentése – RLS dönti el, hogy a hívó owner-e
export const updateCompanySettings = async (patch) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) throw new Error("Profil nem található!");
    if (profile.role !== "owner")
      throw new Error("Csak a tulajdonos módosíthatja a cég beállításait!");

    const row = {
      company_id: profile.company_id,
      ...patch,
      updated_at: new Date(),
    };

    const { data, error } = await supabase
      .from("company_settings")
      .upsert(row, { onConflict: "company_id" })
      .select("company_id, manager_can_edit_drivers, admin_can_add_vehicle, drivers_can_view_warehouse")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("updateCompanySettings Error:", error.message);
    throw error;
  }
};
