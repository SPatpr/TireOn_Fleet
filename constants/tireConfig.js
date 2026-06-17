// =============================================================
// FEJLESZTŐI gumiabroncs-konfiguráció (fixen beégetett gyári értékek)
//
// A határértékeket a felhasználó (még a tulajdonos sem) NEM állíthatja
// az app felületén – kizárólag itt, kódban módosíthatók.
//
// Metrikánként (bar = nyomás, mm = profilmélység) és járműtípusonként
// 3 fix küszöbérték, NÖVEKVŐ sorrendben: [crit, warn, good].
//
// Színezési szabály (a kerék LED-je / kapszulája):
//   • érték <= crit (LEGKISEBB)        → PIROS  ('critical')
//   • crit < érték < good (KÖZEPES)    → SÁRGA  ('warning')
//   • érték >= good (LEGNAGYOBB)       → ZÖLD   ('good')
// (a középső 'warn' küszöb a sárga sáv névleges közepe / referenciája)
//
// Megjegyzés: a modell monoton – minél nagyobb az érték, annál jobb
// (a specifikáció szerinti viselkedés).
// =============================================================

export const TIRE_LIMITS = {
  // alapértelmezett (ismeretlen vagy hiányzó járműtípus esetén)
  default: {
    bar: [6.0, 7.5, 8.5],
    mm: [3, 6, 10],
  },
  truck: {
    bar: [6.0, 7.5, 8.5],
    mm: [4, 8, 12],
  },
  trailer_1: {
    bar: [6.0, 7.5, 8.5],
    mm: [3, 6, 10],
  },
  trailer_2: {
    bar: [6.0, 7.5, 8.5],
    mm: [3, 6, 10],
  },
  trailer_3: {
    bar: [6.0, 7.5, 8.5],
    mm: [3, 6, 10],
  },
  car: {
    bar: [1.8, 2.2, 2.6],
    mm: [1.6, 3, 6],
  },
};

// Egy adott járműtípus + metrika ([crit, warn, good]) küszöbei
export const getThresholds = (vehicleType, metric) => {
  const cfg = TIRE_LIMITS[vehicleType] ?? TIRE_LIMITS.default;
  return cfg[metric] ?? TIRE_LIMITS.default[metric];
};

// A 3-szintű színstátusz egy mért értékhez.
//   metric: 'bar' | 'mm'
//   visszatérés: 'critical' | 'warning' | 'good' | null (nincs adat)
export const getTireStatusFromValue = (value, metric, vehicleType = "default") => {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(num)) return null;

  const [crit, , good] = getThresholds(vehicleType, metric);
  if (num <= crit) return "critical"; // LEGKISEBB vagy alatti → PIROS
  if (num >= good) return "good";      // LEGNAGYOBB vagy feletti → ZÖLD
  return "warning";                    // KÖZEPES → SÁRGA
};
