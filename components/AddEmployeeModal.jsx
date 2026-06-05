import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert, // <--- Ez hiányzott
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

import { inviteEmployee } from "../api/employee";
import { ENUM_LABELS } from "../constans";
import { supabase } from "../lib/supabase"; // <--- Ez hiányzott

const AddEmployeeModal = ({ visible, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "driver",
  });

  // 1. Definiáljuk a hiányzó loading állapotot
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInvite = async () => {
    if (!formData.fullName || !formData.email) {
      Alert.alert("Hiba", "Kérlek töltsd ki az összes mezőt!");
      return;
    }
    if (!isValidEmail(formData.email)) {
      Alert.alert("Hiba", "Kérlek adj meg érvényes email címet!");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error("Nem található cég a profilodhoz!");
      }

      // A backend (Edge Function) válasza itt jön meg
      const response = await inviteEmployee({
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        company_id: profile.company_id,
      });

      await Clipboard.setStringAsync(response.password);
      setFormData({ fullName: "", email: "", role: "driver" });
      Alert.alert(
        "Meghívó elküldve!",
        `Az ideiglenes jelszó a vágólapra másolva. Küldd el ${formData.fullName} számára!`,
        [{ text: "OK", onPress: onClose }],
      );
    } catch (err) {
      Alert.alert("Hiba történt", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.floatingIcon}>
              <FontAwesome5 name="user-plus" size={24} color="#0A2342" />
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={24} color="#ccc" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Új Alkalmazott Meghívása</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.form}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Alkalmazott neve</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pl. Kovács Béla"
                  value={formData.fullName}
                  onChangeText={(val) => handleInputChange("fullName", val)}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Pozíció</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.role}
                      onValueChange={(val) => handleInputChange("role", val)}
                      style={styles.picker}
                      dropdownIconColor="#0A2342"
                    >
                      {Object.entries(ENUM_LABELS.hu.user_role).map(
                        ([key, label]) => (
                          <Picker.Item key={key} label={label} value={key} />
                        ),
                      )}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={styles.label}>Email cím</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="pelda@email.hu"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(val) => handleInputChange("email", val)}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#64748b"
                />
                <Text style={styles.infoText}>
                  A meghívott egy linket kap az email címére a regisztrációhoz.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && { opacity: 0.7 }]}
                onPress={handleInvite}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Meghívó Küldése</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddEmployeeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: { width: "95%", maxHeight: "80%" },
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
  closeButton: { position: "absolute", top: 15, right: 15 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0A2342",
    marginBottom: 20,
  },
  form: { width: "100%" },
  inputRow: { flexDirection: "row", marginBottom: 10 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: "#0A2342", fontWeight: "600", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
  },
  picker: { width: "100%" },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0f4f8",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  infoText: { fontSize: 12, color: "#64748b", marginLeft: 8, flex: 1 },
  saveButton: {
    backgroundColor: "#0A2342",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    height: 55,
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
