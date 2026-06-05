import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_OPTIONS = [
  { value: "good",     label: "Megfelelő",    color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  { value: "warning",  label: "Figyelem",     color: "#d97706", bg: "rgba(217,119,6,0.10)" },
  { value: "critical", label: "Kritikus",     color: "#dc2626", bg: "rgba(220,38,38,0.10)" },
];

const TireStatsModal = ({ visible, onClose, tire, onSave, isSaving }) => {
  const [pressure, setPressure] = useState("");
  const [tread,    setTread]    = useState("");
  const [status,   setStatus]   = useState("good");

  useEffect(() => {
    if (tire) {
      setPressure(tire.pressure != null ? String(tire.pressure) : "");
      setTread(tire.tread       != null ? String(tire.tread)    : "");
      setStatus(tire.status ?? "good");
    }
  }, [tire, visible]);

  const handleSave = () => {
    if (!tire) return;
    onSave({ id: tire.id, pressure, tread, status });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* FEJLÉC */}
          <View style={styles.header}>
            <Text style={styles.title}>Kerék adatai</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* NYOMÁS */}
          <View style={styles.row}>
            <Text style={styles.label}>Nyomás:</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={String(pressure)}
                onChangeText={setPressure}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="pl. 9.2"
                placeholderTextColor="#adb5bd"
              />
              <Text style={styles.unit}>bar</Text>
            </View>
          </View>

          {/* FUTÓFELÜLET */}
          <View style={styles.row}>
            <Text style={styles.label}>Futófelület:</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={String(tread)}
                onChangeText={setTread}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="pl. 8"
                placeholderTextColor="#adb5bd"
              />
              <Text style={styles.unit}>mm</Text>
            </View>
          </View>

          {/* STÁTUSZ */}
          <Text style={styles.statusLabel}>Állapot</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = status === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  style={[
                    styles.statusBtn,
                    { borderColor: opt.color },
                    isActive && { backgroundColor: opt.bg },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.statusBtnText, { color: isActive ? opt.color : "#94a3b8" }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* MENTÉS */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>
              {isSaving ? "Mentés..." : "Változtatások mentése"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TireStatsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0A2342",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  label: {
    width: 100,
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0A2342",
  },
  unit: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
    marginLeft: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "white",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  saveBtn: {
    backgroundColor: "#0A2342",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
