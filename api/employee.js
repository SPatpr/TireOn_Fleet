import { supabase } from "../lib/supabase";

export const inviteEmployee = async (employeeData) => {
  try {
    const { data, error } = await supabase.functions.invoke("invite-employee", {
      body: employeeData,
    });

    if (error) {
      // Az Edge Function-ből jövő hibák kezelése
      throw new Error(error.message || "Hiba történt a meghívás során.");
    }

    return data;
  } catch (error) {
    console.error("Invite API Error:", error);
    throw error;
  }
};

export const getEmployees = async () => {
  try {
    // 1. Aktuális bejelentkezett felhasználó lekérése
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

    // 2. A bejelentkezett admin/owner company_id-jának lekérése
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profil lekérdezési hiba:", profileError);
      throw new Error("Nem sikerült lekérni a profiladatokat.");
    }

    if (!profile.company_id) {
      throw new Error("Nincs cég rendelve ehhez a fiókhoz!");
    }

    // 3. Az összes alkalmazott lekérése, akik ugyanahhoz a céghez tartoznak
    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("full_name", { ascending: true });

    if (employeesError) throw employeesError;

    // Visszaadjuk a listát
    return employees;
  } catch (error) {
    console.error("getEmployees Error:", error.message);
    throw error;
  }
};

export const updateEmployee = async (id, updateData) => {
  if (!id) throw new Error("Hiányzó alkalmazott azonosító!");

  // Bejelentkezett user cégének és szerepkörének ellenőrzése
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

  // Ellenőrizzük, hogy a módosítandó alkalmazott a saját cégünkhöz tartozik-e
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();
  if (targetError || !targetProfile)
    throw new Error("Az alkalmazott nem található, vagy nincs jogosultságod módosítani!");

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase Update Hiba:", error);
    throw error;
  }
  return data;
};
