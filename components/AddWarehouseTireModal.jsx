// =============================================================
// AddWarehouseTireModal
//
// Új abroncs bevételezése a raktárba (vehicle_id / position = NULL).
// Ugyanazokat a technikai mezőket tartalmazza, mint a kam-oldali
// AddTireScreen: Gyártó, Típus, Méret, Gyári/szériaszám (KÖTELEZŐ),
// DOT szám, aktuális nyomás (bar) és profilmélység (mm).
//
// Validáció: kötelező szériaszám + a DEFAULT_TIRE_LIMITS szerinti
// nyomás/profilmélység tartomány. A hibák inline, pirosan jelennek
// meg, és a mentés blokkolódik. (A szerveroldali, megkerülhetetlen
// ellenőrzést a tires tábla validate_tire_limits() triggere végzi.)
//
// Dizájn: fehér kártya, sötét szöveg, EditEmployeeModal-stílusú
// sötétkék (#0A2342) mentés gomb.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DEFAULT_TIRE_LIMITS, validateTireValues } from "../lib/tireLimits";

const BRANDS = [
  "Michelin", "Continental", "Bridgestone",
  "Goodyear", "Pirelli", "Hankook", "Egyéb",
];

const COMMON_SIZES = [
  "315/80 R22.5", "295/80 R22.5", "385/65 R22.5",
  "315/70 R22.5", "245/70 R17.5", "Egyéb méret",
];

const emptyForm = {
  brand: "", customBrand: "",
  model: "",
  size: "", customSize: "",
  serialNumber: "",
  dotNumber: "",
  treadMm: "", pressureBar: "",
};

const AddWarehouseTireModal = ({ visible, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // a mező hibájának törlése gépeléskor
    setErrors((e) => (e[key] || e.pressure || e.tread ? { ...e, [key]: undefined } : e));
  };

  const handleSave = () => {
    const nextErrors = {};

    // Kötelező szériaszám
    if (!form.serialNumber.trim()) {
      nextErrors.serialNumber = "Hiba: A gyári/szériaszám megadása kötelező!";
    }

    // Nyomás + profilmélység tartomány (raktár → DEFAULT limitek)
    const { errors: rangeErrors } = validateTireValues(
      { pressureBar: form.pressureBar, treadMm: form.treadMm },
      DEFAULT_TIRE_LIMITS,
    );
    if (rangeErrors.pressure) nextErrors.pressureBar = rangeErrors.pressure;
    if (rangeErrors.tread) nextErrors.treadMm = rangeErrors.tread;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const brand = form.brand === "Egyéb" ? form.customBrand : form.brand;
    const size = form.size === "Egyéb méret" ? form.customSize : form.size;
    onSave({
      brand:        brand || null,
      model:        form.model.trim() || null,
      size:         size || null,
      serialNumber: form.serialNumber.trim(),
      dotNumber:    form.dotNumber.trim() || null,
      treadMm:      form.treadMm || null,
      pressureBar:  form.pressureBar || null,
    });
  };

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* FEJLÉC */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Új abroncs bevételezése</Text>
              <Text style={styles.subtitle}>A gumi raktárra kerül, jármű nélkül</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* GYÁRTÓ */}
            <Text style={styles.fieldLabel}>Gyártó</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {BRANDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, form.brand === b && styles.chipActive]}
                  onPress={() => set("brand", b)}
                >
                  <Text style={[styles.chipText, form.brand === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {form.brand === "Egyéb" && (
              <TextInput
                style={[styles.textInput, { marginTop: 6 }]}
                value={form.customBrand}
                onChangeText={(v) => set("customBrand", v)}
                placeholder="Gyártó neve..."
                placeholderTextColor="#94a3b8"
              />
            )}

            {/* TÍPUS / MODELL */}
            <Text style={styles.fieldLabel}>Típus / Modell</Text>
            <TextInput
              style={styles.textInput}
              value={form.model}
              onChangeText={(v) => set("model", v)}
              placeholder="pl. X Multi Energy"
              placeholderTextColor="#94a3b8"
            />

            {/* MÉRET */}
            <Text style={styles.fieldLabel}>Méret</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {COMMON_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, form.size === s && styles.chipActive]}
                  onPress={() => set("size", s)}
                >
                  <Text style={[styles.chipText, form.size === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {form.size === "Egyéb méret" && (
              <TextInput
                style={[styles.textInput, { marginTop: 6 }]}
                value={form.customSize}
                onChangeText={(v) => set("customSize", v)}
                placeholder="pl. 265/70 R19.5"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            )}

            {/* GYÁRI / SZÉRIASZÁM – KÖTELEZŐ */}
            <Text style={styles.fieldLabel}>
              Gyári / Szériaszám <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, errors.serialNumber && styles.inputError]}
              value={form.serialNumber}
              onChangeText={(v) => set("serialNumber", v)}
              placeholder="pl. MCH-2024-00441"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
            {errors.serialNumber ? <Text style={styles.errorText}>{errors.serialNumber}</Text> : null}

            {/* DOT SZÁM */}
            <Text style={styles.fieldLabel}>DOT szám (gyártási idő)</Text>
            <TextInput
              style={styles.textInput}
              value={form.dotNumber}
              onChangeText={(v) => set("dotNumber", v)}
              placeholder="pl. 4224"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />

            {/* MÉRT ÉRTÉKEK */}
            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Profilmélység</Text>
                <View style={[styles.measureInput, errors.treadMm && styles.inputError]}>
                  <TextInput
                    style={styles.measureTextInput}
                    value={form.treadMm}
                    onChangeText={(v) => set("treadMm", v)}
                    placeholder="14"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unit}>mm</Text>
                </View>
              </View>

              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Nyomás</Text>
                <View style={[styles.measureInput, errors.pressureBar && styles.inputError]}>
                  <TextInput
                    style={styles.measureTextInput}
                    value={form.pressureBar}
                    onChangeText={(v) => set("pressureBar", v)}
                    placeholder="9.0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unit}>bar</Text>
                </View>
              </View>
            </View>
            {errors.treadMm ? <Text style={styles.errorText}>{errors.treadMm}</Text> : null}
            {errors.pressureBar ? <Text style={styles.errorText}>{errors.pressureBar}</Text> : null}

            {/* MENTÉS */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={20} color="white" />
                  <Text style={styles.saveBtnText}>Bevételezés mentése</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 12 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddWarehouseTireModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,8,20,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0A2342" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: { fontSize: 15, color: "#64748b", fontWeight: "700" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
    marginTop: 12,
  },
  required: { color: "#dc2626" },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  chipActive: { borderColor: "#0A2342", backgroundColor: "#0A2342" },
  chipText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  chipTextActive: { color: "white" },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#0A2342",
    backgroundColor: "#f8fafc",
  },
  inputError: { borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,0.05)" },
  errorText: { color: "#dc2626", fontSize: 12, fontWeight: "600", marginTop: 6 },
  measureRow: { flexDirection: "row", gap: 12 },
  measureField: { flex: 1 },
  measureInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    height: 48,
  },
  measureTextInput: { flex: 1, fontSize: 18, fontWeight: "700", color: "#0A2342" },
  unit: { fontSize: 14, color: "#94a3b8", fontWeight: "600", marginLeft: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A2342",
    height: 55,
    borderRadius: 15,
    marginTop: 22,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: "white", fontSize: 17, fontWeight: "700" },
});
