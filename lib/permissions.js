// =============================================================
// Szerepkör- és jogosultság-segédfüggvények (kliensoldal)
//
// A tényleges biztonságot a Supabase RLS adja; ezek a függvények
// a felület (gombok, navigáció) megjelenítését/elrejtését vezérlik
// a bejelentkezett user szerepköre + a cég beállításai alapján.
//
// Szerepkör-hierarchia: owner > admin > manager > driver
// =============================================================

export const DEFAULT_COMPANY_SETTINGS = {
  manager_can_edit_drivers: true,
  admin_can_add_vehicle: true,
  drivers_can_view_warehouse: false,
};

export const isOwner = (role) => role === "owner";
export const isManagerLevel = (role) => ["owner", "admin", "manager"].includes(role);

// Sofőr: korlátozott, csak olvasó nézet
export const isDriver = (role) => role === "driver";

// Felvehet-e új járművet? (manager/owner mindig; admin a beállítástól függ)
export const canAddVehicle = (role, settings = DEFAULT_COMPANY_SETTINGS) => {
  if (role === "owner" || role === "manager") return true;
  if (role === "admin") return !!settings.admin_can_add_vehicle;
  return false;
};

// Szerkesztheti-e az adott alkalmazottat?
// owner/admin bárkit; manager csak ha a beállítás engedi (és sofőrt szerkeszt)
export const canEditEmployee = (role, targetRole, settings = DEFAULT_COMPANY_SETTINGS) => {
  if (role === "owner" || role === "admin") return true;
  if (role === "manager") {
    if (targetRole === "driver") return !!settings.manager_can_edit_drivers;
    return false; // manager nem szerkeszt admin/owner/manager szintet
  }
  return false;
};

// Láthatja-e a raktárat? admin/manager/owner mindig; sofőr a beállítástól függ
export const canViewWarehouse = (role, settings = DEFAULT_COMPANY_SETTINGS) => {
  if (isManagerLevel(role)) return true;
  if (role === "driver") return !!settings.drivers_can_view_warehouse;
  return false;
};

// Bevételezhet / módosíthatja a raktárt? (sofőr soha)
export const canManageWarehouse = (role) => isManagerLevel(role);
