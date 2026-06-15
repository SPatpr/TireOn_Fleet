// =============================================================
// Minimális teszt-hibajelentő / adatgyűjtő (Feedback Loop)
//
// Ha az app TESZT csatornán fut (preview build vagy fejlesztés),
// a kritikus hibákat (crash) és a kiemelt logokat automatikusan
// beküldi a Supabase `test_logs` táblába, hogy folyamatosan lássuk,
// ha egy tesztelőnél összeomlik vagy hibázik az app.
//
// Éles ('production') buildben a logger NEM küld semmit.
//
// Használat:
//   import { initLogger, logError, logEvent } from "../lib/logger";
//   initLogger();                       // egyszer, app indításkor
//   logError(err, { screen: "Tires" }); // kézzel is hívható
// =============================================================

import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// A csatorna/környezet a build-időben beégetett EXPO_PUBLIC_APP_ENV-ből
// jön (eas.json profilonként állítja). Dev futásban __DEV__ alapján döntünk.
const APP_ENV =
  process.env.EXPO_PUBLIC_APP_ENV ?? (typeof __DEV__ !== "undefined" && __DEV__ ? "development" : "production");

// Tesztkörnyezet = minden, ami nem 'production'
export const isTestEnv = APP_ENV !== "production";

// Eszközinformációk a hibák kontextusához
const getDeviceInfo = () => ({
  os: Platform.OS,
  os_version: String(Platform.Version),
  device_name: Constants.deviceName ?? null,
  app_version: Constants.expoConfig?.version ?? null,
  is_device: Constants.isDevice ?? null,
  app_env: APP_ENV,
});

// Egy log/hiba beküldése a test_logs táblába (hibát soha nem dob tovább)
const sendLog = async ({ level, message, context }) => {
  if (!isTestEnv) return; // élesben kikapcsolva
  try {
    let userId = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
    } catch {
      // anonim tesztelő (még nincs bejelentkezve) – user_id marad null
    }

    await supabase.from("test_logs").insert({
      user_id: userId,
      device_info: getDeviceInfo(),
      error_message: message ? String(message).slice(0, 4000) : null,
      level,
      context: context ?? null,
      app_channel: APP_ENV,
    });
  } catch (e) {
    // A logger SOHA nem dönti meg az appot – csak konzolra írunk.
    console.log("[logger] beküldés sikertelen:", e?.message);
  }
};

// Kritikus hiba naplózása
export const logError = (error, context = null) => {
  const message =
    error?.stack || error?.message || (typeof error === "string" ? error : JSON.stringify(error));
  console.error("[logger]", message);
  return sendLog({ level: "error", message, context });
};

// Sima esemény / teszt-log naplózása
export const logEvent = (message, context = null) => {
  console.log("[logger]", message);
  return sendLog({ level: "info", message, context });
};

// Globális, elkapatlan JS hibák (crash) automatikus naplózása.
// Egyszer, az app indításakor hívd meg (App.js).
let initialized = false;
export const initLogger = () => {
  if (initialized || !isTestEnv) return;
  initialized = true;

  // React Native globális hibakezelője
  const globalHandler = global?.ErrorUtils?.getGlobalHandler?.();
  global?.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    sendLog({
      level: isFatal ? "fatal" : "error",
      message: error?.stack || error?.message || String(error),
      context: { isFatal: !!isFatal, type: "uncaught" },
    });
    // Eredeti kezelő meghívása (különben elnyelnénk a piros hibaképernyőt)
    if (typeof globalHandler === "function") globalHandler(error, isFatal);
  });

  // Kezeletlen promise rejection-ök (best-effort)
  if (global?.process?.on) {
    global.process.on("unhandledRejection", (reason) => {
      sendLog({
        level: "error",
        message: reason?.stack || reason?.message || String(reason),
        context: { type: "unhandledRejection" },
      });
    });
  }
};
