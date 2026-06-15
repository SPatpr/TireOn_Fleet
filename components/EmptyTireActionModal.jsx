// =============================================================
// EmptyTireActionModal
//
// Akkor jelenik meg, amikor a felhasználó egy ÜRES (szürke)
// kerékpozícióra kattint a TiresScreen blueprint nézetében.
// Két választási lehetőséget kínál fel:
//   1) Választás a raktárból  → onChooseFromStock()
//   2) Új kerék hozzáadása     → onAddNew()
//
// Dizájn: tiszta, fehér kártyás opciógombok, sötét szöveggel –
// illeszkedik az alkalmazás eddigi felépítéséhez.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const OPTIONS = [
  {
    key: "stock",
    icon: "warehouse",
    title: "Választás a raktárból",
    subtitle: "Felszerelés egy meglévő, raktáron lévő gumiból",
  },
  {
    key: "new",
    icon: "plus-circle-outline",
    title: "Új kerék hozzáadása",
    subtitle: "Új gumi regisztrálása erre a pozícióra",
  },
];

const EmptyTireActionModal = ({
  visible,
  position,
  positionLabel,
  onChooseFromStock,
  onAddNew,
  onClose,
}) => {
  const handle = (key) => {
    if (key === "stock") onChooseFromStock?.();
    else onAddNew?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          {/* FEJLÉC */}
          <View style={styles.header}>
            <View style={styles.posBadge}>
              <Text style={styles.posBadgeText}>{position}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Üres pozíció</Text>
              {positionLabel ? (
                <Text style={styles.subtitle}>{positionLabel}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* OPCIÓK */}
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.optionBtn}
              onPress={() => handle(opt.key)}
              activeOpacity={0.8}
            >
              <View style={styles.optionIcon}>
                <MaterialCommunityIcons name={opt.icon} size={24} color="#0A2342" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default EmptyTireActionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  posBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0A2342",
    alignItems: "center",
    justifyContent: "center",
  },
  posBadgeText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A2342",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
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
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2342",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
});
