import { supabase } from "../lib/supabase";

// userId opcionális: ha nincs megadva, a bejelentkezett felhasználó profilját
// adja vissza. (RLS így is a saját cégre szűr.)
export const getProfile = async (userId = null) => {
  let id = userId;
  if (!id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Nincs bejelentkezett felhasználó.");
    }
    id = user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
};
