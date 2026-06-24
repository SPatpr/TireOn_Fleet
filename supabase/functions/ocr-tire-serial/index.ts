// =============================================================
// Edge Function: ocr-tire-serial
//
// HÍD az alkalmazás és a Google Cloud Vision API (TEXT_DETECTION) között.
// A Vision API kulcs KIZÁRÓLAG itt, szerveroldali env-változóban él – soha
// nem kerül a mobilappba.
//
// Bemenet (JSON body):
//   { "path": "userId/scan_123.jpg" }   – a tire-scans bucketbeli útvonal
//   vagy
//   { "imageBase64": "<base64>" }       – közvetlen base64 (data-URI előtag nélkül)
//
// Kimenet:
//   { "serial": "MCH2024X0441", "candidates": [...], "rawText": "..." }
//
// -------------------------------------------------------------
// 🔧 BEÁLLÍTÁS – egyszeri lépések
// -------------------------------------------------------------
// 1) GOOGLE CLOUD CONSOLE:
//    - console.cloud.google.com → hozz létre/válassz projektet
//    - "APIs & Services" → "Library" → keresd: "Cloud Vision API" → ENABLE
//    - "APIs & Services" → "Credentials" → "Create credentials" → "API key"
//    - (ajánlott) az API key-t korlátozd: "API restrictions" → csak Vision API
//
// 2) SUPABASE TITKOS ENV-VÁLTOZÓ (a kulcs NEM kerül a kliensbe):
//      supabase secrets set GOOGLE_VISION_API_KEY=AIza...   --project-ref dyaodhjchghfxdngyljn
//    (a SUPABASE_URL és SUPABASE_SERVICE_ROLE_KEY automatikusan elérhető a functionben)
//
// 3) DEPLOY:
//      supabase functions deploy ocr-tire-serial --project-ref dyaodhjchghfxdngyljn
//
// 💰 KÖLTSÉG: a Google Vision TEXT_DETECTION havi ELSŐ 1000 kérése INGYENES,
//    utána kb. $1.50 / 1000 kép. Egy induló logisztikai appnál ez gyakorlatilag 0.
// =============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "tire-scans";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bináris → base64 (darabolva, hogy nagy képnél se boruljon a hívás verem)
const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

// A Vision nyers szövegéből a legvalószínűbb gyári szám kiszűrése.
// Heurisztika: 6–20 hosszú alfanumerikus tokenek, betű+szám keverék előnyben.
const extractSerial = (text: string) => {
  if (!text) return { serial: null as string | null, candidates: [] as string[] };
  const tokens = text.toUpperCase().split(/[^A-Z0-9-]+/).filter(Boolean);
  const candidates = tokens
    .filter((t) => /^[A-Z0-9-]{6,20}$/.test(t) && /\d/.test(t)) // legyen benne szám
    .sort((a, b) => {
      const score = (s: string) =>
        (/[A-Z]/.test(s) ? 1 : 0) + (/\d/.test(s) ? 1 : 0) + s.length / 100;
      return score(b) - score(a);
    });
  // duplikátumok kiszűrése
  const unique = [...new Set(candidates)];
  return { serial: unique[0] ?? null, candidates: unique.slice(0, 5) };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error("Hiányzó GOOGLE_VISION_API_KEY (supabase secrets set ...).");
    }

    const { path, imageBase64 } = await req.json();

    // 1) A kép base64 tartalmának előállítása
    let base64: string | undefined = imageBase64;
    if (!base64 && path) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data, error } = await admin.storage.from(BUCKET).download(path);
      if (error) throw new Error(`Kép letöltése sikertelen: ${error.message}`);
      base64 = toBase64(new Uint8Array(await data.arrayBuffer()));
    }
    if (!base64) throw new Error("Hiányzó kép: adj meg 'path'-t vagy 'imageBase64'-t.");

    // 2) Google Vision – TEXT_DETECTION
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              imageContext: { languageHints: ["en"] },
            },
          ],
        }),
      },
    );

    const visionJson = await visionRes.json();
    if (visionJson.error || visionJson?.responses?.[0]?.error) {
      const msg = visionJson.error?.message || visionJson.responses[0].error.message;
      throw new Error(`Vision API hiba: ${msg}`);
    }

    // 3) Nyers szöveg → tiszta gyári szám
    const rawText: string = visionJson?.responses?.[0]?.textAnnotations?.[0]?.description ?? "";
    const { serial, candidates } = extractSerial(rawText);

    return new Response(JSON.stringify({ serial, candidates, rawText }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
