// =============================================================
// EditTireSpecModal
//
// Egy járműtípus gumiabroncs-határértékeinek szerkesztése:
// min/max nyomás (bar) és min/max profilmélység (mm).
//
// Dizájn: EditEmployeeModal-stílusú fehér kártya, sötétkék
// (#0A2342) mentés gombbal.
// =============================================================

import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const numField = (raw) => String(raw ?? "");

const EditTireSpecModal = ({ visible, spec, typeLabel, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({ minBar: "", maxBar: "", minMm: "", maxMm: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (spec) {
      setForm({
        minBar: numField(spec.min_bar),
        maxBar: numField(spec.max_bar),
        minMm: numField(spec.min_mm),
        maxMm: numField(spec.max_mm),
      });
      setError(null);
    }
  }, [spec, visible]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const handleSave = () => {
    const minBar = parseFloat(String(form.minBar).replace(",", "."));
    const maxBar = parseFloat(String(form.maxBar).replace(",", "."));
    const minMm = parseFloat(String(form.minMm).replace(",", "."));
    const maxMm = parseFloat(String(form.maxMm).replace(",", "."));

    if ([minBar, maxBar, minMm, maxMm].some((n) => Number.isNaN(n))) {
      setError("Hiba: Minden mezőt számmal kell kitölteni!");
      return;
    }
    if ([minBar, maxBar, minMm, maxMm].some((n) => n < 0 || n > 99.99)) {
      setError("Hiba: Az értékek 0 és 99.99 között lehetnek!");
      return;
    }
    if (maxBar < minBar) {
      setError("Hiba: A max. nyomás nem lehet kisebb a min. nyomásnál!");
      return;
    }
    if (maxMm < minMm) {
      setError("Hiba: A max. profilmélység nem lehet kisebb a min. értéknél!");
      return;
    }

    onSave({
      vehicleType: spec.vehicle_type,
      minBar, maxBar, minMm, maxMm,
    });
  };

  if (!spec) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{typeLabel}</Text>
              <Text style={styles.subtitle}>Megengedett határértékek</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* NYOMÁS (BAR) */}
          <Text style={styles.groupLabel}>Nyomás (bar)</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Minimum</Text>
              <TextInput
                style={styles.input}
                value={form.minBar}
                onChangeText={(v) => set("minBar", v)}
                keyboardType="decimal-pad"
                placeholder="6.0"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Maximum</Text>
              <TextInput
                style={styles.input}
                value={form.maxBar}
                onChangeText={(v) => set("maxBar", v)}
                keyboardType="decimal-pad"
                placeholder="9.5"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* PROFILMÉLYSÉG (MM) */}
          <Text style={styles.groupLabel}>Profilmélység (mm)</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Minimum</Text>
              <TextInput
                style={styles.input}
                value={form.minMm}
                onChangeText={(v) => set("minMm", v)}
                keyboardType="decimal-pad"
                placeholder="3"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Maximum</Text>
              <TextInput
                style={styles.input}
                value={form.maxMm}
                onChangeText={(v) => set("maxMm", v)}
                keyboardType="decimal-pad"
                placeholder="25"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{isSaving ? "Mentés..." : "Mentés"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EditTireSpecModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,8,20,0.7)",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: "700", color: "#0A2342" },
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
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0A2342",
    marginTop: 14,
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 17,
    fontWeight: "700",
    color: "#0A2342",
    backgroundColor: "#f8fafc",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: "#0A2342",
    height: 54,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: "white", fontSize: 17, fontWeight: "700" },
});
