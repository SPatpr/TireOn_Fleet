import { supabase } from "../lib/supabase";

/**
 * Új jármű létrehozása a bejelentkezett felhasználó cégéhez
 */
export const createVehicle = async (vehicleData) => {
  try {
    // 1. Lekérjük a bejelentkezett felhasználót
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

    // 2. Megkeressük a felhasználó profilját, hogy megkapjuk a company_id-t
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Supabase lekérdezési hiba:", profileError);
      throw profileError;
    }
    if (!profile.company_id)
      throw new Error("Nincs cég rendelve ehhez a fiókhoz!");

    // 3. Mentés a vehicles táblába
    const { data, error } = await supabase
      .from("vehicles")
      .insert([
        {
          ...vehicleData, // Itt jön a plate_number, vin_number, brand, stb.
          company_id: profile.company_id, // Ezt mi adjuk hozzá biztonsági okokból
          status: vehicleData.status || "active", // Alapértelmezett státusz
          current_km: vehicleData.current_km || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      // Ha a hiba oka a rendszám ütközés (ha van UNIQUE constraint)
      if (error.code === "23505") {
        throw new Error("Ezzel a rendszámmal már létezik jármű a rendszerben!");
      }
      throw error;
    }

    return data; // Visszaadjuk az elmentett járművet
  } catch (error) {
    console.error("createVehicle Error:", error.message);
    throw error;
  }
};

export const getVehicles = async () => {
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

    if (profileError || !profile) throw profileError;

    let query = supabase
      .from("vehicles")
      .select(
        `
        *,
        driver_vehicles (
          profile_id
        )
      `,
      )
      .eq("company_id", profile.company_id);

    if (profile.role === "driver") {
      query = query.eq("driver_vehicles.profile_id", user.id);
    }

    const { data, error: vehiclesError } = await query.order("created_at", {
      ascending: false,
    });

    if (vehiclesError) throw vehiclesError;

    if (profile.role === "driver") {
      return data.filter(
        (vehicle) =>
          vehicle.driver_vehicles && vehicle.driver_vehicles.length > 0,
      );
    }

    return data;
  } catch (error) {
    console.error("getVehicles Error:", error.message);
    throw error;
  }
};

export const updateVehicle = async (vehicleId, updateData) => {
  try {
    // 0. LÉPÉS: Bejelentkezett user cégének és szerepkörének ellenőrzése
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
    if (!["admin", "manager"].includes(profile.role))
      throw new Error("Nincs jogosultságod ezt a műveletet végezni!");

    // Ellenőrizzük, hogy a jármű valóban a saját cégünkhöz tartozik-e
    const { data: ownedVehicle, error: ownerError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("company_id", profile.company_id)
      .single();
    if (ownerError || !ownedVehicle)
      throw new Error("A jármű nem található, vagy nincs jogosultságod módosítani!");

    // 1. LÉPÉS: Frissítjük a jármű státuszát a 'vehicles' táblában
    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({ status: updateData.status })
      .eq("id", vehicleId);

    if (vehicleError) throw vehicleError;

    // 2. LÉPÉS: Töröljük az összes régi sofőr kapcsolatot ehhez a kamionhoz
    const { error: deleteError } = await supabase
      .from("driver_vehicles")
      .delete()
      .eq("vehicle_id", vehicleId);

    if (deleteError) throw deleteError;

    // 3. LÉPÉS: Ha vannak kiválasztott sofőrök, beszúrjuk az új kapcsolatokat
    if (updateData.driverIds && updateData.driverIds.length > 0) {
      const insertRows = updateData.driverIds.map((driverId) => ({
        vehicle_id: vehicleId,
        profile_id: driverId,
      }));

      const { error: insertError } = await supabase
        .from("driver_vehicles")
        .insert(insertRows);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error("updateVehicle Error:", error.message);
    throw error;
  }
};
