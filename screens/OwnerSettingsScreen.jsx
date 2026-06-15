// =============================================================
// OwnerSettingsScreen – Tulajdonosi Vezérlőpult
//
// CSAK 'owner' szerepkörrel érhető el. Két fő szekció:
//   1) Jogosultság-mátrix (Switch-ek) → company_settings
//   2) Járműtípus-specifikus gumi-határértékek → tire_specs
//
// Védelem: kliensoldalon a nem-owner felhasználót azonnal
// visszairányítjuk a főoldalra; az íráshoz a Supabase RLS is
// owner-jogosultságot követel (company_settings_owner_write).
//
// Háttér: mély sötétkék/fekete (#050c18); a panelek fehérek.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCompanySettings, updateCompanySettings } from "../api/companyAPI";
import { getProfile } from "../api/profileApi";
import { getTireSpecs, upsertTireSpec } from "../api/tireSpecAPI";
import EditTireSpecModal from "../components/EditTireSpecModal";
import { ENUM_LABELS } from "../constans.js";
import { DEFAULT_COMPANY_SETTINGS } from "../lib/permissions";

const DARK = "#050c18";

const MATRIX = [
  {
    key: "manager_can_edit_drivers",
    title: "Menedzser szerkesztheti a sofőröket",
    desc: "A menedzser módosíthatja a sofőrök adatait és beosztását.",
    icon: "account-edit",
  },
  {
    key: "admin_can_add_vehicle",
    title: "Admin felvehet új járművet",
    desc: "Az admin regisztrálhat új kamiont a flottába.",
    icon: "truck-plus",
  },
  {
    key: "drivers_can_view_warehouse",
    title: "Sofőrök láthatják a raktárt",
    desc: "A sofőrök megtekinthetik a gumiabroncs-raktár készletét.",
    icon: "warehouse",
  },
];

const typeLabel = (t) => ENUM_LABELS.hu.vehicle_type[t] ?? t;

const OwnerSettingsScreen = ({ navigation }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [settings, setSettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [savingKey, setSavingKey] = useState(null);

  const [specs, setSpecs] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [specModalVisible, setSpecModalVisible] = useState(false);
  const [specSaving, setSpecSaving] = useState(false);

  // --- OWNER-GATE + adatbetöltés ---
  const init = useCallback(async () => {
    try {
      const profile = await getProfile();
      if (!profile || profile.role !== "owner") {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      const [s, sp] = await Promise.all([getCompanySettings(), getTireSpecs()]);
      setSettings(s);
      setSpecs(sp);
    } catch (err) {
      console.error("Owner init error:", err.message);
      setAllowed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Nem-owner → vissza a főoldalra
  useEffect(() => {
    if (!checking && !allowed) {
      navigation?.navigate?.("Home");
    }
  }, [checking, allowed, navigation]);

  // --- Mátrix kapcsoló ---
  const handleToggle = async (key, value) => {
    const prev = settings;
    setSettings((s) => ({ ...s, [key]: value })); // optimista
    setSavingKey(key);
    try {
      const saved = await updateCompanySettings({ [key]: value });
      setSettings((s) => ({ ...s, ...saved }));
    } catch (err) {
      setSettings(prev); // visszaállítás hibára
      Alert.alert("Hiba", err.message || "Nem sikerült menteni a beállítást.");
    } finally {
      setSavingKey(null);
    }
  };

  // --- Gumi-határérték szerkesztés ---
  const handleSaveSpec = async (values) => {
    setSpecSaving(true);
    try {
      const saved = await upsertTireSpec(values);
      setSpecs((prev) =>
        prev.map((s) => (s.vehicle_type === saved.vehicle_type ? { ...s, ...saved } : s)),
      );
      setSpecModalVisible(false);
      setSelectedSpec(null);
    } catch (err) {
      Alert.alert("Mentési hiba", err.message || "Ismeretlen hiba történt.");
    } finally {
      setSpecSaving(false);
    }
  };

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
        <Text style={styles.deniedText}>Ez a felület kizárólag a tulajdonos számára érhető el.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.crown}>
          <MaterialCommunityIcons name="crown" size={22} color="#0A2342" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tulajdonosi vezérlőpult</Text>
          <Text style={styles.headerSubtitle}>Jogosultságok és globális limitek</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* JOGOSULTSÁG-MÁTRIX */}
        <Text style={styles.sectionLabel}>Jogosultság-mátrix</Text>
        <View style={styles.panel}>
          {MATRIX.map((item, idx) => (
            <View
              key={item.key}
              style={[styles.matrixRow, idx < MATRIX.length - 1 && styles.matrixDivider]}
            >
              <View style={styles.matrixIcon}>
                <MaterialCommunityIcons name={item.icon} size={20} color="#0A2342" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.matrixTitle}>{item.title}</Text>
                <Text style={styles.matrixDesc}>{item.desc}</Text>
              </View>
              {savingKey === item.key ? (
                <ActivityIndicator color="#0A2342" style={{ width: 51 }} />
              ) : (
                <Switch
                  value={!!settings[item.key]}
                  onValueChange={(v) => handleToggle(item.key, v)}
                  trackColor={{ false: "#cbd5e1", true: "#0A2342" }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#cbd5e1"
                />
              )}
            </View>
          ))}
        </View>

        {/* GUMI-HATÁRÉRTÉKEK */}
        <Text style={styles.sectionLabel}>Gumi-határértékek (járműtípusonként)</Text>
        <Text style={styles.sectionHint}>
          A megadott min/max nyomás és profilmélység alapján a rendszer megakadályozza
          a veszélyes vagy irreális értékek mentését az egész cégben.
        </Text>
        <View style={styles.panel}>
          {specs.map((spec, idx) => (
            <TouchableOpacity
              key={spec.vehicle_type}
              style={[styles.specRow, idx < specs.length - 1 && styles.matrixDivider]}
              activeOpacity={0.7}
              onPress={() => { setSelectedSpec(spec); setSpecModalVisible(true); }}
            >
              <View style={styles.matrixIcon}>
                <MaterialCommunityIcons name="tire" size={20} color="#0A2342" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.matrixTitle}>{typeLabel(spec.vehicle_type)}</Text>
                <Text style={styles.specMeta}>
                  {spec.min_bar}–{spec.max_bar} bar · {spec.min_mm}–{spec.max_mm} mm
                </Text>
              </View>
              <MaterialCommunityIcons name="pencil" size={20} color="#475569" />
            </TouchableOpacity>
          ))}
          {specs.length === 0 && (
            <Text style={styles.emptyText}>Nincsenek beállított járműtípusok.</Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <EditTireSpecModal
        visible={specModalVisible}
        spec={selectedSpec}
        typeLabel={selectedSpec ? typeLabel(selectedSpec.vehicle_type) : ""}
        onClose={() => { setSpecModalVisible(false); setSelectedSpec(null); }}
        onSave={handleSaveSpec}
        isSaving={specSaving}
      />
    </SafeAreaView>
  );
};

export default OwnerSettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  center: { justifyContent: "center", alignItems: "center", padding: 30 },
  deniedTitle: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 18, textAlign: "center" },
  deniedText: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 21 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  crown: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f5d061",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "white", fontSize: 21, fontWeight: "700", letterSpacing: 0.3 },
  headerSubtitle: { color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 3 },

  scroll: { padding: 16 },
  sectionLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHint: { color: "#64748b", fontSize: 12, lineHeight: 17, marginBottom: 10, marginLeft: 4 },

  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  matrixRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  specRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  matrixDivider: { borderBottomWidth: 1, borderBottomColor: "#eef2f7" },
  matrixIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  matrixTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  matrixDesc: { fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 16 },
  specMeta: { fontSize: 13, color: "#334155", fontWeight: "700", marginTop: 3 },
  emptyText: { color: "#64748b", fontSize: 14, paddingVertical: 18, textAlign: "center" },
});
