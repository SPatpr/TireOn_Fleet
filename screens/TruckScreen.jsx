import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// API importok
import { getCompanySettings } from "../api/companyAPI";
import { getEmployees } from "../api/employee";
import { getProfile } from "../api/profileApi";
import { createVehicle, getVehicles, updateVehicle } from "../api/truckAPI";

// Komponens importok
import AddTruckModal from "../components/AddTruckModal";
import EditVehicleModal from "../components/EditVehicleModal";
import TruckListItem from "../components/TruckListItem";
import { canAddVehicle, canViewWarehouse, DEFAULT_COMPANY_SETTINGS, isDriver } from "../lib/permissions";

const TruckScreen = ({ navigation, route }) => {
  const fromAdmin = route?.params?.fromAdmin ?? false; // Admin Központból nyílt-e
  // --- JOGOSULTSÁG ÁLLAPOTOK ---
  const [userRole, setUserRole] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [authLoading, setAuthLoading] = useState(true);

  // --- ADAT ÁLLAPOTOK ---
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]); // Sofőrök listája a Many-to-Many modalhoz
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // --- MODAL ÁLLAPOTOK ---
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // --- 1. LÉPÉS: JOGOSULTSÁG ÉS KÖRNYEZET ELLENŐRZÉSE ---
  useEffect(() => {
    const checkAuthAndLoadInitialData = async () => {
      try {
        setAuthLoading(true);
        const profile = await getProfile();

        if (profile) {
          setUserRole(profile.role);
          setCompanyId(profile.company_id);

          // Cég jogosultság-mátrixa (gombok mutatása/elrejtése)
          getCompanySettings(profile.company_id)
            .then(setSettings)
            .catch(() => {});

          // Ha admin vagy manager, a sofőröket is le kell töltenünk a kapcsolati listához
          if (profile.role === "admin" || profile.role === "manager") {
            const employeeList = await getEmployees();
            // Csak a driver szerepkörű embereket engedjük a listába
            const onlyDrivers = employeeList.filter(
              (emp) => emp.role === "driver",
            );
            setDrivers(onlyDrivers);
          }
        }
      } catch (error) {
        console.error("Hiba az inicializálás során:", error.message);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthAndLoadInitialData();
  }, []);

  // --- 2. LÉPÉS: FLOTTA ADATOK BETÖLTÉSE ---
  const loadVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error("Hiba a járművek betöltésekor:", error.message);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userRole) {
      loadVehicles();
    }
  }, [authLoading, userRole]);

  // --- 3. MŰVELETEK (MŰKÖDŐ FUNKCIÓK) ---

  // Kártyára kattintás:
  //  - Sofőr: a kerekek CSAK OLVASHATÓ nézete nyílik meg (nincs szerkesztés)
  //  - Admin/Manager/Owner: szerkesztő modal
  const handleOpenEdit = (vehicle) => {
    if (isDriver(userRole)) {
      navigation?.navigate("Tires", {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        vehicleType: vehicle.type,
        model: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || null,
        readOnly: true,
      });
      return;
    }
    setSelectedVehicle(vehicle);
    setEditModalVisible(true);
  };

  // Változtatások mentése a Many-to-Many rendszerben
  const handleSaveVehicle = async (updatedData) => {
    try {
      // Meghívjuk a truckAPI frissített függvényét
      await updateVehicle(updatedData.id, {
        status: updatedData.status,
        driverIds: updatedData.driverIds,
      });

      Alert.alert("Siker", "A módosítások sikeresen elmentve a felhőbe!");
      setEditModalVisible(false);
      loadVehicles(); // Lista azonnali frissítése a képernyőn
    } catch (error) {
      Alert.alert("Hiba a mentés során", error.message);
    }
  };

  // Új jármű mentése
  const handleAddVehicle = async (vehicleData) => {
    try {
      await createVehicle(vehicleData);
      Alert.alert("Siker", "Az új jármű sikeresen hozzáadva!");
      setAddModalVisible(false);
      loadVehicles();
    } catch (error) {
      Alert.alert("Hiba", error.message);
    }
  };

  // Raktár kezelése – a cég gumiabroncs-raktára (company_id biztonságos átadása)
  const handleNavigateToWarehouse = () => {
    navigation?.navigate("TireWarehouse", { companyId });
  };

  const showWarehouseButton = canViewWarehouse(userRole, settings);
  const showAddVehicleButton = canAddVehicle(userRole, settings);

  // Kerekek kezelése gomb átirányítása
  const handleNavigateToTires = (vehicle) => {
    setEditModalVisible(false);
    // Feltételezve, hogy a navigációd "Tires" vagy "TruckTires" néven ismeri a képernyőt
    if (navigation) {
      navigation.navigate("Tires", {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        vehicleType: vehicle.type,
        model: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || null,
      });
    } else {
      console.log("Navigáció nincs bekötve, a jármű:", vehicle.plate_number);
    }
  };

  // --- 4. RENDERING: Amíg az Auth ellenőriz ---
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "white", marginTop: 10 }}>
          Profil ellenőrzése...
        </Text>
      </SafeAreaView>
    );
  }

  // --- 5. RENDERING: KÉSZ FELÜLET ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {fromAdmin && (
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerBackBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Flotta</Text>
          <Text style={styles.headerSubtitle}>
            Járművek és sofőr hozzárendelések
          </Text>
        </View>
      </View>

      {/* RAKTÁR KEZELÉSE GOMB – a jogosultság-mátrix szerint */}
      {showWarehouseButton && (
        <TouchableOpacity
          style={styles.warehouseButton}
          activeOpacity={0.85}
          onPress={handleNavigateToWarehouse}
        >
          <View style={styles.warehouseIconBox}>
            <MaterialCommunityIcons name="warehouse" size={22} color="#39e6ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.warehouseButtonTitle}>Raktár kezelése</Text>
            <Text style={styles.warehouseButtonSub}>Szabad abroncsok és bevételezés</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#64748b" />
        </TouchableOpacity>
      )}

      {/* JÁRMŰ FLUID LISTA */}
      {vehiclesLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TruckListItem
              brand={item.brand}
              model={item.model}
              plate={item.plate_number}
              status={item.status}
              onPress={() => handleOpenEdit(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Nincsenek elérhető járművek.</Text>
            </View>
          }
        />
      )}

      {/* PRÉMIUM JÁRMŰ HOZZÁADÁSA GOMB – a jogosultság-mátrix szerint */}
      {showAddVehicleButton && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setAddModalVisible(true)} // MOST MÁR VALÓBAN MEGNYITJA
          >
            <Text style={styles.addButtonText}>Új Jármű Regisztrálása</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ÉLESÍTETT SZERKESZTÉS MODAL */}
      <EditVehicleModal
        visible={editModalVisible}
        vehicle={selectedVehicle}
        drivers={drivers} // Átadva a szűrt, valós sofőrök listája az adatbázisból!
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveVehicle} // Éles mentés bekötve
        onNavigateToTires={handleNavigateToTires} // Kerekek kezelése bekötve
      />

      <AddTruckModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddVehicle}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A2342" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 15,
    marginBottom: 10,
  },
  headerBackBtn: { marginRight: 6, marginLeft: -8 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "white" },
  headerSubtitle: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  warehouseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 24,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0f1c33",
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  warehouseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(57,230,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.25)",
  },
  warehouseButtonTitle: { color: "white", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  warehouseButtonSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  emptyText: { color: "#94a3b8", fontSize: 16 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
  },
  addButton: {
    backgroundColor: "#1e293b", // Finom palaszürke/kék háttér a harsány zöld helyett
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
});

export default TruckScreen;
