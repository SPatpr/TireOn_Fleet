import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Checkbox, IconButton, Text } from "react-native-paper";
import { ENUM_LABELS } from "../constans";

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Aktív",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.10)",
    icon: "check-circle-outline",
  },
  {
    value: "maintenance",
    label: "Szervizben",
    color: "#d97706",
    bg: "rgba(217,119,6,0.10)",
    icon: "wrench-outline",
  },
  {
    value: "inactive",
    label: "Üzemen kívül",
    color: "#64748b",
    bg: "rgba(100,116,139,0.10)",
    icon: "pause-circle-outline",
  },
];

const EditVehicleModal = ({
  visible,
  onClose,
  vehicle,
  drivers = [], // Biztonsági default üres tömb
  onSave,
  onDelete,
  onNavigateToTires,
}) => {
  const [status, setStatus] = useState("active");
  const [selectedDrivers, setSelectedDrivers] = useState([]); // Kiválasztott ID-k
  const [searchQuery, setSearchQuery] = useState(""); // Keresési szöveg

  // Adatok inicializálása a modal megnyitásakor
  useEffect(() => {
    if (vehicle) {
      setStatus(vehicle.status || "active");

      // Kinyerjük a járműhöz rendelt sofőrök ID-jait a Many-to-Many struktúrából
      const currentDriverIds =
        vehicle.driver_vehicles?.map((dv) => dv.profile_id) || [];
      setSelectedDrivers(currentDriverIds);

      // Kereső ürítése minden megnyitáskor
      setSearchQuery("");
    }
  }, [vehicle, visible]);

  // Sofőr ki/be kapcsolása
  const toggleDriver = (driverId) => {
    if (selectedDrivers.includes(driverId)) {
      setSelectedDrivers(selectedDrivers.filter((id) => id !== driverId));
    } else {
      setSelectedDrivers([...selectedDrivers, driverId]);
    }
  };

  // Keresési szűrés (név alapján)
  const filteredDrivers = drivers.filter((driver) =>
    driver.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSave = () => {
    if (!vehicle) return;
    onSave({
      id: vehicle.id,
      status: status,
      driverIds: selectedDrivers,
    });
  };

  // Törlés megerősítő Alerttel
  const handleDelete = () => {
    if (!vehicle) return;
    Alert.alert(
      "Jármű törlése",
      `Biztosan törlöd a(z) ${vehicle.plate_number || "jármű"} járművet? A hozzá tartozó kerekek és előzmények is törlődnek. Ez nem vonható vissza.`,
      [
        { text: "Mégse", style: "cancel" },
        { text: "Törlés", style: "destructive", onPress: () => onDelete?.(vehicle.id) },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* LEBEGŐ JÁRMŰ IKON */}
          <View style={styles.avatarOuterWrapper}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="truck" size={45} color="white" />
            </View>
          </View>

          {/* BEZÁRÁS GOMB */}
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
            iconColor="#64748b"
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // A billentyűzet ne akadjon össze a kattintásokkal
          >
            {/* JÁRMŰ FEJLÉC ADATOK */}
            <Text style={styles.vehicleTitle}>{vehicle?.plate_number}</Text>
            <Text style={styles.vehicleSubTitle}>{vehicle?.model}</Text>

            {/* ÁLTALÁNOS INFORMÁCIÓK CARD */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Általános információk</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Típus:</Text>
                <Text style={styles.value}>
                  {ENUM_LABELS.hu.vehicle_type[vehicle?.type] || vehicle?.type}
                </Text>
              </View>

              <Text style={styles.pickerLabel}>Jármű státusza</Text>
              <View style={styles.statusButtonRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = status === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.statusButton,
                        { borderColor: opt.color },
                        isActive && { backgroundColor: opt.bg },
                      ]}
                      onPress={() => setStatus(opt.value)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={20}
                        color={isActive ? opt.color : "#94a3b8"}
                      />
                      <Text
                        style={[
                          styles.statusButtonText,
                          { color: isActive ? opt.color : "#94a3b8" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* INTELLIGENS SOFŐR KIVÁLASZTÓ SZEKCIÓ */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Sofőrök hozzárendelése</Text>

              {/* INTERAKTÍV KERESŐSÁV */}
              <View style={styles.searchBarWrapper}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color="#64748b"
                  style={styles.searchIcon}
                />
                <TextInput
                  placeholder="Keresés név alapján (pl. Kovács)..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* KIVÁLASZTOTT SOFŐRÖK KAPSZULÁI (TOKENS) */}
              {selectedDrivers.length > 0 && (
                <View style={styles.tokenContainer}>
                  {drivers
                    .filter((d) => selectedDrivers.includes(d.id))
                    .map((driver) => (
                      <View key={driver.id} style={styles.driverToken}>
                        <Text style={styles.tokenText}>{driver.full_name}</Text>
                        <TouchableOpacity
                          style={styles.tokenCloseBtn}
                          onPress={() => toggleDriver(driver.id)}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={14}
                            color="#0A2342"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}

              {/* A SZŰRT SOFŐRLISTA */}
              <Text style={styles.listHeader}>
                {searchQuery ? "Keresési találatok:" : "Összes sofőr listája:"}
              </Text>

              <View style={styles.driversListWrapper}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  {filteredDrivers.length === 0 ? (
                    <Text style={styles.noResultText}>
                      Nincs ilyen nevű sofőr a cégben.
                    </Text>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const isChecked = selectedDrivers.includes(driver.id);
                      return (
                        <TouchableOpacity
                          key={driver.id}
                          style={[
                            styles.checkboxRow,
                            isChecked && styles.checkboxRowSelected,
                          ]}
                          activeOpacity={0.6}
                          onPress={() => toggleDriver(driver.id)}
                        >
                          <Checkbox.Android
                            status={isChecked ? "checked" : "unchecked"}
                            color="#0A2342"
                          />
                          <Text
                            style={[
                              styles.driverNameText,
                              isChecked && styles.driverNameTextSelected,
                            ]}
                          >
                            {driver.full_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>

            {/* NAVIGÁCIÓS GOMB A KEREKEKHEZ */}
            <TouchableOpacity
              style={styles.tireBtn}
              activeOpacity={0.8}
              onPress={() => onNavigateToTires(vehicle)}
            >
              <MaterialCommunityIcons name="tire" size={24} color="#0A2342" />
              <Text style={styles.tireBtnText}>
                Kerekek és abroncsok kezelése
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#0A2342"
              />
            </TouchableOpacity>

            {/* MENTÉS GOMB */}
            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.8}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Változtatások mentése</Text>
            </TouchableOpacity>

            {/* JÁRMŰ TÖRLÉSE */}
            <TouchableOpacity
              style={styles.deleteBtn}
              activeOpacity={0.8}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Jármű törlése</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 8, 20, 0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 30,
    paddingTop: 40,
    maxHeight: "85%", // Megakadályozzuk, hogy túl nagyra nőjön a modal
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarOuterWrapper: {
    position: "absolute",
    top: -45,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#0A2342",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "white",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 11,
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
  },
  vehicleTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0A2342",
    marginTop: 10,
  },
  vehicleSubTitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 15,
    width: "100%",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0A2342",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#64748b",
    fontSize: 15,
  },
  value: {
    color: "#0A2342",
    fontWeight: "600",
    fontSize: 15,
  },
  pickerLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "white",
    gap: 4,
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },

  /* --- INTELLIGENS KERESŐ STÍLUSOK --- */
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  tokenContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  driverToken: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tokenText: {
    fontSize: 13,
    color: "#0A2342",
    fontWeight: "600",
  },
  tokenCloseBtn: {
    marginLeft: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 2,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  driversListWrapper: {
    maxHeight: 180,
    width: "100%",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  checkboxRowSelected: {
    backgroundColor: "#f0fdf4",
  },
  driverNameText: {
    fontSize: 16,
    color: "#334155",
    marginLeft: 6,
  },
  driverNameTextSelected: {
    color: "#0A2342",
    fontWeight: "700",
  },
  noResultText: {
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },

  tireBtn: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    width: "100%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  tireBtnText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#0A2342",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#0A2342",
    width: "100%",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.06)",
    marginTop: 12,
  },
  deleteBtnText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
});

export default EditVehicleModal;
