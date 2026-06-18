export const ENUM_LABELS = {
  hu: {
    user_role: {
      owner: "Tulajdonos",
      admin: "Adminisztrátor",
      driver: "Sofőr",
      manager: "Telephelyvezető",
    },
    tire_status: {
      mounted: "Felszerelve",
      stored: "Raktáron",
      disposed: "Selejtezve",
      damaged: "Sérült",
    },
    vehicle_status: {
      active: "Aktív",
      inactive: "Üzemen kívül",
      maintenance: "Szervizben",
    },
    vehicle_type: {
      truck: "Nyergesvontató",
      trailer: "Pótkocsi",
      trailer_1: "Félpótkocsi",
      trailer_2: "Megaspace pótkocsi",
      trailer_3: "Speciális pótkocsi",
      car: "Személyautó",
    },
  },
  en: {
    user_role: {
      owner: "Owner",
      admin: "Administrator",
      driver: "Driver",
      manager: "Manager",
    },
    tire_status: {
      mounted: "Mounted",
      stored: "In Storage",
      disposed: "Disposed",
      damaged: "Damaged",
    },
    // ... és így tovább a többi nyelvvel
  },
};
