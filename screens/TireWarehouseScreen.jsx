// =============================================================
// TireWarehouseScreen
//
// A cég gumiabroncs-raktára: a járműre még fel NEM szerelt
// (szabad) abroncsok listája + új abroncs bevételezése.
//
// Navigációs paraméterek (route.params):
//   companyId {uuid} – opcionális; ha hiányzik, a profilból jön
//
// Háttér: mély ipari sötétkék/fekete (#050c18).
// A gumikártyák TISZTÁN FEHÉREK, sötét szöveggel.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addTireToWarehouse, getWarehouseTires } from "../api/tireAPI";
import { getProfile } from "../api/profileApi";
import AddWarehouseTireModal from "../components/AddWarehouseTireModal";
import { canManageWarehouse } from "../lib/permissions";

const DARK = "#050c18";

// Egy raktári gumi fehér kártyája
const WarehouseTireCard = ({ tire }) => {
  const title = [tire.brand, tire.model].filter(Boolean).join(" ") || "Ismeretlen gumi";
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="tire" size={26} color="#0A2342" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>

        <View style={styles.metaRow}>
          {tire.size ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{tire.size}</Text>
            </View>
          ) : null}
          {tire.dot_number ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>DOT {tire.dot_number}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.measureRow}>
          <View style={styles.measureItem}>
            <MaterialCommunityIcons name="ruler" size={14} color="#475569" />
            <Text style={styles.measureText}>
              {tire.current_mm != null ? `${tire.current_mm} mm` : "– mm"}
            </Text>
          </View>
          <View style={styles.measureItem}>
            <MaterialCommunityIcons name="gauge" size={14} color="#475569" />
            <Text style={styles.measureText}>
              {tire.current_bar != null ? `${tire.current_bar} bar` : "– bar"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.stockBadge}>
        <Text style={styles.stockBadgeText}>RAKTÁR</Text>
      </View>
    </View>
  );
};

const TireWarehouseScreen = ({ navigation, route }) => {
  const companyId = route?.params?.companyId ?? null;

  const [tires, setTires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canManage, setCanManage] = useState(false); // bevételezés joga

  useEffect(() => {
    let active = true;
    getProfile()
      .then((p) => { if (active) setCanManage(canManageWarehouse(p?.role)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const loadWarehouse = useCallback(async () => {
    try {
      const rows = await getWarehouseTires(companyId);
      setTires(rows);
    } catch (err) {
      console.error("Warehouse load error:", err.message);
      Alert.alert("Hiba", "Nem sikerült betölteni a raktárt.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadWarehouse();
  }, [loadWarehouse]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWarehouse();
  };

  const handleSaveNewTire = async (tireData) => {
    setIsSaving(true);
    try {
      await addTireToWarehouse(tireData);
      setModalVisible(false);
      await loadWarehouse();
      Alert.alert("Siker", "Az abroncs sikeresen bevételezve a raktárba.");
    } catch (err) {
      Alert.alert("Mentési hiba", err.message || "Ismeretlen hiba történt.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* FEJLÉC */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Raktár</Text>
          <Text style={styles.headerSubtitle}>
            Szabad abroncsok · {tires.length} db
          </Text>
        </View>
        <MaterialCommunityIcons name="package-variant-closed" size={26} color="#39e6ff" />
      </View>

      {/* ÚJ ABRONCS BEVÉTELEZÉSE GOMB – csak akinek joga van hozzá */}
      {canManage && (
        <TouchableOpacity
          style={styles.intakeBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus-circle" size={22} color="#ffffff" />
          <Text style={styles.intakeBtnText}>Új abroncs bevételezése</Text>
        </TouchableOpacity>
      )}

      {/* LISTA */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <FlatList
          data={tires}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <WarehouseTireCard tire={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="package-variant" size={56} color="#1e293b" />
              <Text style={styles.emptyTitle}>Üres a raktár</Text>
              <Text style={styles.emptyText}>
                Vételezz be új abroncsot a fenti gombbal.
              </Text>
            </View>
          }
        />
      )}

      <AddWarehouseTireModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveNewTire}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
};

export default TireWarehouseScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
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
  intakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    height: 55,
    borderRadius: 15,
    backgroundColor: "#0A2342",
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  intakeBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  listContent: { padding: 16, paddingBottom: 40 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 8,
  },
  emptyTitle: { color: "#cbd5e1", fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptyText: { color: "#475569", fontSize: 13, textAlign: "center" },

  // --- FEHÉR GUMI KÁRTYA ---
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
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", letterSpacing: 0.2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  metaBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaBadgeText: { fontSize: 11, color: "#475569", fontWeight: "700", letterSpacing: 0.3 },
  measureRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  measureItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  measureText: { fontSize: 13, color: "#334155", fontWeight: "700" },
  stockBadge: {
    backgroundColor: "rgba(54,226,198,0.12)",
    borderWidth: 1,
    borderColor: "#36e2c6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockBadgeText: { fontSize: 9, color: "#0f766e", fontWeight: "800", letterSpacing: 0.8 },
});
