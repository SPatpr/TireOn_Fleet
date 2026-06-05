import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { email, role, company_id, fullName } = await req.json()
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const generatedPassword = Math.random().toString(36).slice(-8) + "!" + Math.floor(Math.random() * 100);

    // 1. FELHASZNÁLÓ LÉTREHOZÁSA (Email megerősítés nélkül, mert mi küldjük a jelszót)
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
    if (authError) throw authError

    // 2. PROFIL LÉTREHOZÁSA
    await supabaseAdmin.from('profiles').upsert([{ 
      id: userData.user.id, 
      company_id: company_id, 
      role: role, 
      full_name: fullName 
    }])
    const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('official_name')
        .eq('id', company_id)
        .single()

      if (companyError) {
          console.error("Hiba a cégnév lekérésekor:", companyError)
      }

// Ha nem találja, legyen egy tartalék név
const companyName = companyData?.official_name || "a csapatunk";

    // 3. EMAIL KÜLDÉSE A RESEND-DEL
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'TireOn <onboarding@resend.dev>', // Később saját domaint is használhatsz
        to: [email],
        subject: 'Üdvözlünk a TireOn csapatában!',
        html: `
          <h1>Szia ${fullName}!</h1>
          <p>Létrehoztuk a fiókodat a TireOn alkalmazásban.</p>
          <p>A(z) <strong>${companyName}</strong> munkatársaként létrehoztuk a fiókodat a TireOn alkalmazásban.</p>
          <p><strong>Belépési jelszavad:</strong> ${generatedPassword}</p>
          <p>Kérjük, az első belépés után változtasd meg a jelszavadat!</p>
        `,
      }),
    })

    return new Response(JSON.stringify({ message: "Sikeres!" }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})