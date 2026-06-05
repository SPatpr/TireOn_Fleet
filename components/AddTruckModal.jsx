import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ENUM_LABELS } from "../constans";

const AddTruckModal = ({ visible, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    plate_number: "",
    vin_number: "",
    brand: "",
    model: "",
    type: "tractor",
    current_km: "",
    status: "active",
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    const dataToSave = {
      ...formData,
      current_km: parseInt(formData.current_km) || 0,
    };
    await onSave(dataToSave);
    // onClose a szülő (TruckScreen) hívja sikeres mentés után
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            {/* LEBEGŐ IKON */}
            <View style={styles.floatingIcon}>
              <FontAwesome5 name="truck" size={24} color="#0A2342" />
            </View>

            {/* BEZÁRÁS */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color="#ccc" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Új Jármű Felvétele</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.form}
            >
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Rendszám</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ABC-123"
                    value={formData.plate_number}
                    onChangeText={(val) =>
                      handleInputChange("plate_number", val)
                    }
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={styles.label}>Alvázszám (VIN)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="17 karakter"
                    value={formData.vin_number}
                    onChangeText={(val) => handleInputChange("vin_number", val)}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Gyártó (Brand)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pl. Volvo"
                    value={formData.brand}
                    onChangeText={(val) => handleInputChange("brand", val)}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Modell</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pl. FH16"
                    value={formData.model}
                    onChangeText={(val) => handleInputChange("model", val)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Jármű típusa</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.type}
                    onValueChange={(val) => handleInputChange("type", val)}
                    style={styles.picker}
                  >
                    {Object.entries(ENUM_LABELS.hu.vehicle_type).map(
                      ([key, label]) => (
                        <Picker.Item key={key} label={label} value={key} />
                      ),
                    )}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Aktuális km állás</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.current_km}
                  onChangeText={(val) => handleInputChange("current_km", val)}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Jármű Mentése</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddTruckModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "95%",
    maxHeight: "85%",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    paddingTop: 45,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingIcon: {
    position: "absolute",
    top: -35,
    alignSelf: "center",
    backgroundColor: "#fff",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#0A2342",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0A2342",
    marginBottom: 20,
  },
  form: {
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#0A2342",
    fontWeight: "600",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#0A2342",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
