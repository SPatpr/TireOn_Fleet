import { supabase } from "../lib/supabase";

export const signUpNewCompany = async ({
  email,
  password,
  fullName,
  companyName,
  taxId,
}) => {
  // 1. Felhasználó létrehozása a Supabase Auth-ban
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("A felhasználó létrehozása sikertelen.");

  // 2. Cég létrehozása (a plan_id már nem itt van, hanem a subscriptions-ben)
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .insert([
      {
        official_name: companyName,
        tax_id: taxId,
      },
    ])
    .select()
    .single();

  if (companyError) throw companyError;

  // 3. Előfizetés létrehozása (Mivel külön táblába raktuk)
  const { error: subError } = await supabase.from("subscriptions").insert([
    {
      company_id: companyData.id,
      plan_id: "free",
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 nap
    },
  ]);

  if (subError) throw subError;

  // 4. Profil frissítése (Az SQL Trigger már létrehozta az alap profil sort,
  // nekünk csak össze kell kötnünk a céggel)

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authData.user.id, // Kulcsfontosságú!
      company_id: companyData.id,
      role: "admin", // Itt kényszerítjük, hogy admin legyen
      full_name: fullName,
    },
    { onConflict: "id" },
  ); // Ha az ID ütközik, frissítsen

  if (profileError) throw profileError;

  return authData.user;
};

export const SignIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  return data.user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};
