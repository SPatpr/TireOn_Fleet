// =============================================================
// Járműtípus-specifikus gumiabroncs-határértékek API-ja
// (tire_specs tábla). RLS: olvasás cégtagoknak, írás admin/manager.
// =============================================================

import { DEFAULT_TIRE_LIMITS, specRowToLimits } from "../lib/tireLimits";
import { supabase } from "../lib/supabase";

// A bejelentkezett user cégének összes járműtípus-határértéke
export const getTireSpecs = async (companyId = null) => {
  try {
    let cid = companyId;
    if (!cid) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (profileError || !profile?.company_id)
        throw new Error("Nincs cég rendelve ehhez a fiókhoz!");
      cid = profile.company_id;
    }

    const { data, error } = await supabase
      .from("tire_specs")
      .select("id, vehicle_type, min_bar, max_bar, min_mm, max_mm, updated_at")
      .eq("company_id", cid)
      .order("vehicle_type", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getTireSpecs Error:", error.message);
    throw error;
  }
};

// Egy járműtípus határértékeinek mentése (admin/manager – RLS dönt)
export const upsertTireSpec = async ({ vehicleType, minBar, maxBar, minMm, maxMm }) => {
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
    if (!profile.company_id) throw new Error("Nincs cég rendelve ehhez a fiókhoz!");
    if (!["owner", "admin", "manager"].includes(profile.role))
      throw new Error("Nincs jogosultságod a határértékek módosításához!");

    const row = {
      company_id:   profile.company_id,
      vehicle_type: vehicleType,
      min_bar:      parseFloat(minBar),
      max_bar:      parseFloat(maxBar),
      min_mm:       parseFloat(minMm),
      max_mm:       parseFloat(maxMm),
      updated_at:   new Date(),
    };

    const { data, error } = await supabase
      .from("tire_specs")
      .upsert(row, { onConflict: "company_id,vehicle_type" })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("upsertTireSpec Error:", error.message);
    throw error;
  }
};

// Egy adott járműtípus kliens-limitjei (validációhoz).
// Ha nincs spec sor vagy nincs típus → DEFAULT_TIRE_LIMITS.
export const getLimitsForVehicleType = async (vehicleType, companyId = null) => {
  try {
    if (!vehicleType) return DEFAULT_TIRE_LIMITS;
    const specs = await getTireSpecs(companyId);
    const row = specs.find((s) => s.vehicle_type === vehicleType);
    return specRowToLimits(row);
  } catch {
    return DEFAULT_TIRE_LIMITS;
  }
};
