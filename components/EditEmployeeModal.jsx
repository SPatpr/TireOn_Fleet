import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ENUM_LABELS } from "../constans.js";

const getAssignedVehicle = (employee) => {
  if (!employee) return null;
  if (employee.driver_vehicles?.length > 0) {
    const rel = employee.driver_vehicles[0];
    return rel.vehicles || rel.vehicle || null;
  }
  if (Array.isArray(employee.vehicles) && employee.vehicles.length > 0) return employee.vehicles[0];
  if (employee.vehicles && !Array.isArray(employee.vehicles)) return employee.vehicles;
  return null;
};

// Járműtípus → ikon / magyar felirat
const typeIcon = (type) =>
  type === "car" ? "car" : (type ?? "").startsWith("trailer") ? "truck-trailer" : "truck";
const typeLabel = (type) => ENUM_LABELS.hu.vehicle_type[type] || type || "Ismeretlen";

const EditEmployeeModal = ({ visible, onClose, employee, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    phone_number: "",
    role: "",
  });

  // Adatok szinkronizálása a megnyitott alkalmazottal
  useEffect(() => {
    if (employee) {
      setFormData({
        phone_number: employee.phone_number || "",
        role: employee.role || "",
      });
    }
  }, [employee, visible]);

  // Mentés gomb eseménykezelője - Átadja a kritikus fontosságú ID-t is!
  const handleSave = () => {
    if (!employee) return;

    onSave({
      id: employee.id, // Erre az ID-ra van szüksége a Supabase .eq() feltételének!
      phone_number: formData.phone_number,
      role: formData.role,
    });
  };

  // Törlés megerősítő Alerttel
  const handleDelete = () => {
    if (!employee) return;
    Alert.alert(
      "Alkalmazott törlése",
      `Biztosan törlöd: ${employee.full_name || "ez az alkalmazott"}? Ez a művelet nem vonható vissza.`,
      [
        { text: "Mégse", style: "cancel" },
        { text: "Törlés", style: "destructive", onPress: () => onDelete?.(employee.id) },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* PROFILKÉP (Avatar) - A kártya tetején középen */}
          <View style={styles.avatarOuterWrapper}>
            <View style={styles.avatarCircle}>
              {employee?.avatar_url ? (
                <Image
                  source={{ uri: employee.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <FontAwesome5 name="user" size={30} color="white" />
              )}
            </View>
          </View>

          {/* BEZÁRÁS GOMB (X) */}
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
            iconColor="#64748b"
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* DOLGOZÓ TELJES NEVE */}
            <Text style={styles.employeeName}>{employee?.full_name}</Text>

            {/* KAPCSOLATI ADATOK KÁRTYA */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <View style={styles.inputRow}>
                <Text style={styles.label}>Phone:</Text>
                <TextInput
                  value={formData.phone_number}
                  onChangeText={(t) =>
                    setFormData({ ...formData, phone_number: t })
                  }
                  style={styles.input}
                  placeholder="+36..."
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.emailValue}>
                  {employee?.email || "Nincs megadva"}
                </Text>
              </View>
            </View>

            {/* BEOSZTÁS ÉS JÁRMŰ KÁRTYA */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Role & Assigned Truck</Text>

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Beosztás</Text>
                <Picker
                  selectedValue={formData.role}
                  onValueChange={(val) =>
                    setFormData({ ...formData, role: val })
                  }
                  style={styles.picker}
                >
                  {Object.keys(ENUM_LABELS.hu.user_role).map((key) => (
                    <Picker.Item
                      key={key}
                      label={ENUM_LABELS.hu.user_role[key]}
                      value={key}
                    />
                  ))}
                </Picker>
              </View>

              {(() => {
                const truck = getAssignedVehicle(employee);
                if (truck?.model || truck?.plate_number) {
                  return (
                    <View style={styles.truckCard}>
                      <View style={styles.truckIconBox}>
                        <MaterialCommunityIcons name={typeIcon(truck.type)} size={24} color="#0A2342" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.truckPlate}>
                          {truck.plate_number || truck.plate || "Nincs rendszám"}
                        </Text>
                        <Text style={styles.truckMeta}>
                          {typeLabel(truck.type)}
                          {truck.model ? ` · ${truck.model}` : ""}
                        </Text>
                      </View>
                    </View>
                  );
                }
                if (formData.role === "driver") {
                  return <Text style={styles.noTruckText}>Nincs hozzárendelt jármű</Text>;
                }
                return null;
              })()}
            </View>

            {/* MENTÉS GOMB */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Mentés</Text>
            </TouchableOpacity>

            {/* ALKALMAZOTT TÖRLÉSE */}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Alkalmazott törlése</Text>
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
    position: "relative",
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
  employeeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0A2342",
    marginBottom: 20,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 15,
    width: "100%",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2342",
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    width: 60,
    fontSize: 15,
    color: "#64748b",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: "white",
    color: "#0A2342",
  },
  emailValue: {
    fontSize: 16,
    color: "#0A2342",
    fontWeight: "500",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 15,
    backgroundColor: "white",
    marginTop: 5,
  },
  pickerLabel: {
    fontSize: 12,
    color: "#94a3b8",
    paddingLeft: 12,
    paddingTop: 5,
  },
  picker: {
    height: 50,
  },
  truckCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 15,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  truckIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  truckPlate: { fontSize: 16, fontWeight: "800", color: "#0f172a", letterSpacing: 0.5 },
  truckMeta: { fontSize: 13, color: "#64748b", marginTop: 2 },
  noTruckText: {
    textAlign: "center",
    marginTop: 15,
    color: "#94a3b8",
    fontStyle: "italic",
    width: "100%",
  },
  saveBtn: {
    backgroundColor: "#0A2342",
    width: "100%",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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

export default EditEmployeeModal;
