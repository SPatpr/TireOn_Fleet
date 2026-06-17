// =============================================================
// AdminDashboardScreen – Moduláris Cégvezérlés / Admin Központ
//
// A Profil oldalról elérhető központ (admin/manager/owner). A cég
// erőforrásait szigorúan külön szekciókként, fehér kártyákként
// jeleníti meg, mindegyiken élő, company_id-re szűrt számlálóval.
//
// Kártyák → dedikált, teljes képernyős kezelőfelületek:
//   🚛 Járművek      → VehiclesManage (TruckScreen)
//   🛞 Abroncs raktár → TireWarehouse
//   👥 Sofőrök        → PeopleManage (roleScope: driver)
//   🔑 Vezetőség      → PeopleManage (roleScope: management)
//
// Háttér: mély ipari sötétkék/fekete (#050c18); kártyák fehérek.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAdminCounts } from "../api/companyAPI";
import { getProfile } from "../api/profileApi";
import { isManagerLevel } from "../lib/permissions";

const DARK = "#050c18";

const AdminDashboardScreen = ({ navigation }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [role, setRole] = useState(null);
  const [counts, setCounts] = useState({ vehicles: 0, warehouse: 0, drivers: 0, management: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  // Szerep-gate + adatbetöltés a képernyő minden fókuszálásakor
  // (így a számlálók frissülnek, ha közben módosult valami).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const profile = await getProfile();
          if (!active) return;
          if (!profile || !isManagerLevel(profile.role)) {
            setAllowed(false);
            setChecking(false);
            navigation?.goBack?.();
            return;
          }
          setAllowed(true);
          setCompanyId(profile.company_id);
          setRole(profile.role);
          setChecking(false);
          setCountsLoading(true);
          const c = await getAdminCounts(profile.company_id);
          if (active) setCounts(c);
        } catch {
          if (active) setAllowed(false);
        } finally {
          if (active) { setChecking(false); setCountsLoading(false); }
        }
      })();
      return () => { active = false; };
    }, [navigation]),
  );

  const SECTIONS = [
    {
      key: "vehicles",
      icon: "truck",
      title: "Járművek kezelése",
      desc: "Kamionok, rendszámok, járműtípusok és sofőr-hozzárendelés",
      count: counts.vehicles,
      unit: "jármű",
      onPress: () => navigation?.navigate("VehiclesManage", { fromAdmin: true }),
    },
    {
      key: "warehouse",
      icon: "warehouse",
      title: "Abroncs raktár",
      desc: "Szabad kerekek, új abroncs bevételezése",
      count: counts.warehouse,
      unit: "raktáron",
      onPress: () => navigation?.navigate("TireWarehouse", { companyId }),
    },
    {
      key: "drivers",
      icon: "account-hard-hat",
      title: "Sofőrök",
      desc: "Sofőr-profilok, telefonszámok, hozzárendelt kamionok",
      count: counts.drivers,
      unit: "sofőr",
      onPress: () => navigation?.navigate("PeopleManage", { roleScope: "driver" }),
    },
    {
      key: "management",
      icon: "shield-account",
      title: "Adminok & Menedzserek",
      desc: "A cégvezetés tagjai, szerepkörök kiosztása",
      count: counts.management,
      unit: "fő",
      onPress: () => navigation?.navigate("PeopleManage", { roleScope: "management" }),
    },
    // Tulajdonosi jogosultság-mátrix – kizárólag owner
    ...(role === "owner"
      ? [{
          key: "owner",
          icon: "shield-key",
          title: "Jogosultságok",
          desc: "Cég-szintű jogosultsági mátrix (tulajdonos)",
          count: null,
          unit: "",
          onPress: () => navigation?.navigate("OwnerSettings"),
        }]
      : []),
  ];

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (!allowed) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="lock-outline" size={72} color="#ef4444" />
        <Text style={styles.deniedTitle}>Hozzáférés megtagadva</Text>
        <Text style={styles.deniedText}>Ez a felület csak a cégvezetés számára érhető el.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* FEJLÉC */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Cégvezérlés</Text>
          <Text style={styles.headerSubtitle}>Adminisztrációs központ</Text>
        </View>
        <MaterialCommunityIcons name="shield-account" size={24} color="#39e6ff" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((s) => (
          <TouchableOpacity key={s.key} style={styles.card} activeOpacity={0.85} onPress={s.onPress}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name={s.icon} size={28} color="#0A2342" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                {s.count != null && (
                  <View style={styles.countPill}>
                    {countsLoading ? (
                      <ActivityIndicator size="small" color="#0A2342" />
                    ) : (
                      <Text style={styles.countPillText}>{s.count} {s.unit}</Text>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.cardDesc}>{s.desc}</Text>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  center: { justifyContent: "center", alignItems: "center", padding: 30 },
  deniedTitle: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 18, textAlign: "center" },
  deniedText: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 21 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: { marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "700", letterSpacing: 0.5 },
  headerSubtitle: {
    color: "#475569",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 3,
  },

  scroll: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", letterSpacing: 0.2, flexShrink: 1 },
  cardDesc: { fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 16 },
  countPill: {
    backgroundColor: "#0A2342",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 44,
    alignItems: "center",
  },
  countPillText: { color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
});
