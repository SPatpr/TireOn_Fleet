import { supabase } from '../lib/supabase';

export const signUpNewCompany = async ({ email, password, fullName, companyName, taxId }) => {
  
  const { data: authData, error: UserError } = await supabase.auth.signUp({
      email,
      password
  });

  if (UserError) throw new Error(UserError.message);
  
  if (!authData.user) throw new Error("A felhasználó létrehozása sikertelen.");

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert([{ 
      official_name: companyName, 
      tax_id: taxId, 
      subscription_plan: 'free'
    }])
    .select()
    .single();

  if (companyError) throw companyError;

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      company_id: companyData.id,
      full_name: fullName,
      role: 'owner',
      status: 'active'
    }]);

  if (profileError) throw profileError;

  return authData.user;
};