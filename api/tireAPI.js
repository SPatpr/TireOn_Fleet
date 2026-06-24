import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// MEGLÉVŐ FUNKCIÓK
// ─────────────────────────────────────────────────────────────

export const updateTireData = async (vehicleId, tireId, updateData) => {
  try {
    const row = {
      vehicle_id: vehicleId,
      position:   tireId,
      status:     "mounted",
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

export const getTiresByVehicle = async (vehicleId) => {
  try {
    const { data, error } = await supabase
      .from("tires")
      .select(
        "id, position, current_bar, current_mm, status, operational_status, " +
        "brand, model, size, serial_number, dot_number, barcode, photo_url"
      )
      .eq("vehicle_id", vehicleId)
      .eq("status", "mounted");

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getTiresByVehicle Error:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// ÚJ GUMI REGISZTRÁLÁSA
// ─────────────────────────────────────────────────────────────
// Valódi séma alapján:
//   tires.id          → integer (identity)
//   tire_history.action       → varchar (nem event_type)
//   tire_history.new_position → varchar (nem to_position)
//   tire_history.notes        → text    (nem note)
// ─────────────────────────────────────────────────────────────

export const addNewTire = async (vehicleId, tireData) => {
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

    const row = {
      vehicle_id:        vehicleId,
      company_id:        profile.company_id,
      position:          tireData.position,
      status:            "mounted",
      operational_status: "good",
      brand:             tireData.brand        || null,
      model:             tireData.model        || null,
      size:              tireData.size         || null,
      dot_number:        tireData.dotNumber    || null,
      serial_number:     tireData.serialNumber || null,
      barcode:           tireData.barcode      || null,
      current_mm:        parseFloat(tireData.treadMm)     || null,
      current_bar:       parseFloat(tireData.pressureBar) || null,
    };

    const { data: savedTire, error: tireError } = await supabase
      .from("tires")
      .upsert(row, { onConflict: "vehicle_id,position" })
      .select()
      .single();

    if (tireError) throw tireError;

    // Esemény naplózása – tire_history valódi oszlopnevekkel
    await supabase.from("tire_history").insert({
      tire_id:      savedTire.id,
      vehicle_id:   vehicleId,
      action:       "registered",
      new_position: tireData.position,
      notes:        tireData.note || "Gumi bevételezve",
      performed_by: user.id,
    });

    return savedTire;
  } catch (error) {
    console.error("addNewTire Error:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// FOTÓ FELTÖLTÉSE – OPCIÓ A / C közös logika
//
// Paraméterek:
//   tireId    – integer (tires.id)
//   vehicleId – integer (vehicles.id)
//   base64    – nyers base64 string (data URI előtag nélkül)
//   mimeType  – pl. "image/jpeg"
// ─────────────────────────────────────────────────────────────

export const uploadTirePhoto = async (tireId, vehicleId, base64Data, mimeType = "image/jpeg") => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nem vagy bejelentkezve!");

    const ext      = mimeType === "image/png" ? "png" : "jpg";
    const filePath = `${user.id}/${vehicleId}/${tireId}_${Date.now()}.${ext}`;

    // base64 → ArrayBuffer (base64-arraybuffer csomag, már telepítve)
    const arrayBuffer = decode(base64Data);

    const { error: uploadError } = await supabase.storage
      .from("tire-photos")
      .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("tire-photos")
      .getPublicUrl(filePath);

    // photo_url visszaírása a tires sorba
    await supabase
      .from("tires")
      .update({ photo_url: publicUrl })
      .eq("id", tireId);

    // Esemény naplózása
    await supabase.from("tire_history").insert({
      tire_id:      tireId,
      vehicle_id:   vehicleId,
      action:       "photo_added",
      notes:        `Fotó feltöltve: ${publicUrl}`,
      performed_by: user.id,
    });

    return publicUrl;
  } catch (error) {
    console.error("uploadTirePhoto Error:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// GUMI KERESÉSE VONALKÓD ALAPJÁN (Opció B)
// company_id nincs a tires táblán – vehicle join nélkül,
// a vonalkód önmagában elég azonosítónak.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// RAKTÁRON LÉVŐ (NEM FELSZERELT) GUMIK LISTÁJA – CÉG-SZINTŰ
//
// Csak azokat a gumikat adja vissza, amelyek a megadott céghez
// tartoznak (company_id) és nincsenek felszerelve (vehicle_id IS NULL).
// A company_id paraméter opcionális – ha hiányzik, a bejelentkezett
// user profiljából vesszük. (RLS amúgy is a saját cégre szűr.)
// ─────────────────────────────────────────────────────────────

export const getWarehouseTires = async (companyId = null) => {
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
      .from("tires")
      .select(
        "id, brand, model, size, dot_number, serial_number, barcode, " +
        "current_bar, current_mm, operational_status, status, position"
      )
      .eq("company_id", cid)
      .is("vehicle_id", null)
      .order("id", { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("getWarehouseTires Error:", error.message);
    throw error;
  }
};

// Visszafelé kompatibilis alias – a TiresScreen "Választás a raktárból"
// folyamata ezt hívja (cég-szűrés a profilból, RLS-szel együtt).
export const getStockTires = () => getWarehouseTires();

// ─────────────────────────────────────────────────────────────
// ÚJ ABRONCS BEVÉTELEZÉSE A RAKTÁRBA
//
// Az új gumi vehicle_id és position nélkül (NULL) kerül be, így
// "szabad", raktári készletként jelenik meg. A company_id-t a
// bejelentkezett user profiljából vesszük (RLS-konform).
// ─────────────────────────────────────────────────────────────

export const addTireToWarehouse = async (tireData) => {
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
      throw new Error("Nincs jogosultságod abroncsot bevételezni!");

    const row = {
      company_id:         profile.company_id,
      vehicle_id:         null,            // raktáron → nincs járműhöz rendelve
      position:           null,            // raktáron → nincs pozíció
      status:             "stored",        // tire_status enum: mounted/stored/disposed/damaged
      operational_status: "good",
      brand:              tireData.brand        || null,
      model:              tireData.model        || null,
      size:               tireData.size         || null,
      dot_number:         tireData.dotNumber    || null,
      serial_number:      tireData.serialNumber || null,
      barcode:            tireData.barcode      || null,
      current_mm:         parseFloat(tireData.treadMm)     || null,
      current_bar:        parseFloat(tireData.pressureBar) || null,
    };

    const { data: savedTire, error: tireError } = await supabase
      .from("tires")
      .insert(row)
      .select()
      .single();

    if (tireError) throw tireError;

    // Esemény naplózása
    await supabase.from("tire_history").insert({
      tire_id:      savedTire.id,
      vehicle_id:   null,
      action:       "stock_in",
      notes:        tireData.note || "Bevételezve raktárba",
      performed_by: user.id,
    });

    return savedTire;
  } catch (error) {
    console.error("addTireToWarehouse Error:", error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// RAKTÁRI GUMI FELSZERELÉSE EGY ÜRES POZÍCIÓRA
//   tireId    – a raktári gumi tires.id-je
//   vehicleId – cél jármű
//   position  – cél pozíció (pl. "RR2")
// ─────────────────────────────────────────────────────────────

export const mountStockTire = async (tireId, vehicleId, position) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: mounted, error } = await supabase
      .from("tires")
      .update({ vehicle_id: vehicleId, position, status: "mounted" })
      .eq("id", tireId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("tire_history").insert({
      tire_id:      tireId,
      vehicle_id:   vehicleId,
      action:       "mounted",
      new_position: position,
      notes:        "Raktárból felszerelve",
      performed_by: user?.id ?? null,
    });

    return mounted;
  } catch (error) {
    console.error("mountStockTire Error:", error.message);
    throw error;
  }
};

export const findTireByBarcode = async (barcodeValue) => {
  try {
    const { data, error } = await supabase
      .from("tires")
      .select("id, brand, model, size, dot_number, serial_number, barcode, status, vehicle_id, position")
      .eq("barcode", barcodeValue)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("findTireByBarcode Error:", error.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// OCR – GYÁRI/SZÉRIASZÁM BEOLVASÁSA (Google Vision az Edge Functionön át)
//
// Folyamat:
//   1) A kamerából kapott base64 feltöltése a PRIVÁT tire-scans bucketbe
//      (a saját mappánkba: ${user.id}/scan_<ts>.jpg)
//   2) Az ocr-tire-serial Edge Function meghívása a kép útvonalával (path)
//      – a kulcs szerveroldalon marad, a függvény tölti le + küldi a Visionnek
//   3) A visszakapott gyári szám (serial) + jelöltek visszaadása a UI-nak
//
// Visszatérés: { serial, candidates, rawText, path }  (hiba esetén throw)
// ─────────────────────────────────────────────────────────────
export const scanTireSerial = async (base64Image, mimeType = "image/jpeg") => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nem vagy bejelentkezve!");
    if (!base64Image) throw new Error("Hiányzó kép a beolvasáshoz.");

    // 1) Feltöltés a privát tire-scans bucketbe
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const path = `${user.id}/scan_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("tire-scans")
      .upload(path, decode(base64Image), { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    // 2) Edge Function (Google Vision híd) hívása a kép útvonalával
    const { data, error } = await supabase.functions.invoke("ocr-tire-serial", {
      body: { path },
    });
    if (error) throw new Error(error.message || "Az OCR feldolgozás sikertelen.");
    if (data?.error) throw new Error(data.error);

    // 3) Eredmény
    return {
      serial: data?.serial ?? null,
      candidates: data?.candidates ?? [],
      rawText: data?.rawText ?? "",
      path,
    };
  } catch (error) {
    console.error("scanTireSerial Error:", error.message);
    throw error;
  }
};
