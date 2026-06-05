import { supabase } from "../lib/supabase";

/**
 * Frissíti egy pozícióban lévő gumi nyomásadatát.
 * A `tires` táblában vehicle_id + position + status='mounted' alapján frissít.
 */
export const updateTireData = async (vehicleId, tireId, updateData) => {
  try {
    // Upsert: ha nem létezik sor (vehicle_id, position) párra, létrehozza;
    // ha már van, frissíti. A unique constraint teszi ezt lehetővé.
    const row = {
      vehicle_id: vehicleId,
      position: tireId,
      status: "mounted",
    };
    if (updateData.pressure !== undefined)
      row.current_bar = parseFloat(updateData.pressure) || null;
    if (updateData.tread !== undefined)
      row.current_mm = parseFloat(updateData.tread) || null;
    if (updateData.status !== undefined)
      row.operational_status = updateData.status || null;

    const { error } = await supabase
      .from("tires")
      .upsert(row, { onConflict: "vehicle_id,position" });

    if (error) throw error;
  } catch (error) {
    console.error("updateTireData Error:", error.message);
    throw error;
  }
};

/**
 * Lekéri egy jármű felszerelt gumiabroncsainak adatait.
 */
export const getTiresByVehicle = async (vehicleId) => {
  try {
    const { data, error } = await supabase
      .from("tires")
      .select("position, current_bar, current_mm, status, operational_status")
      .eq("vehicle_id", vehicleId)
      .eq("status", "mounted");

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getTiresByVehicle Error:", error.message);
    throw error;
  }
};
