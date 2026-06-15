// =============================================================
// Gumiabroncs határérték-validáció (kliensoldal)
//
// A limitek elsődlegesen a járműtípus-specifikus beállításokból
// (tire_specs tábla) jönnek; ahol nincs ismert járműtípus (pl.
// raktári bevételezés), az abszolút DEFAULT_TIRE_LIMITS érvényes.
//
// A szerveroldali (megkerülhetetlen) ellenőrzést a tires táblán
// lévő validate_tire_limits() trigger végzi – ez a modul a gyors,
// felhasználóbarát kliensoldali visszajelzésért felel.
// =============================================================

// Abszolút alapértékek – egyben a raktári bevételezés limitjei.
export const DEFAULT_TIRE_LIMITS = {
  minBar: 0,
  maxBar: 10.5,
  minMm: 0,
  maxMm: 25,
};

// numeric(4,2) felső korlát az adatbázisban → 99.99 fölött a mentés is hibázna
const DB_NUMERIC_MAX = 99.99;

// Egy mező numerikus ellenőrzése; üres mező nem hiba (opcionális).
const checkRange = (raw, { min, max, unit, label }) => {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;

  const normalized = String(raw).replace(",", ".").trim();
  const value = Number(normalized);

  if (Number.isNaN(value)) return `Hiba: A(z) ${label} csak szám lehet!`;
  if (value < 0) return `Hiba: A(z) ${label} nem lehet negatív!`;
  if (value > DB_NUMERIC_MAX) return `Hiba: A(z) ${label} értéke irreálisan nagy!`;
  if (value < min) return `Hiba: A(z) ${label} nem lehet kisebb, mint ${min} ${unit}!`;
  if (value > max) return `Hiba: A(z) ${label} nem haladhatja meg a ${max} ${unit} értéket!`;
  return null;
};

// Visszaad: { valid: boolean, errors: { pressure?: string, tread?: string } }
export const validateTireValues = (
  { pressureBar, treadMm } = {},
  limits = DEFAULT_TIRE_LIMITS,
) => {
  const errors = {};

  const pErr = checkRange(pressureBar, {
    min: limits.minBar,
    max: limits.maxBar,
    unit: "bar",
    label: "nyomás",
  });
  if (pErr) errors.pressure = pErr;

  const tErr = checkRange(treadMm, {
    min: limits.minMm,
    max: limits.maxMm,
    unit: "mm",
    label: "profilmélység",
  });
  if (tErr) errors.tread = tErr;

  return { valid: Object.keys(errors).length === 0, errors };
};

// tire_specs sorból (snake_case) → kliens limit objektum (camelCase)
export const specRowToLimits = (row) => {
  if (!row) return DEFAULT_TIRE_LIMITS;
  return {
    minBar: Number(row.min_bar),
    maxBar: Number(row.max_bar),
    minMm: Number(row.min_mm),
    maxMm: Number(row.max_mm),
  };
};
