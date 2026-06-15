// =============================================================
// WarehouseTireModal
//
// A raktáron lévő (nem felszerelt) gumik listáját jeleníti meg.
// A felhasználó egy gumit kiválasztva az adott pozícióra szereli.
//
// Props:
//   visible       {bool}
//   positionLabel {string}  – cél pozíció felirata (pl. "Jobb Hátsó 2")
//   tires         {array}   – raktári gumik (getStockTires eredménye)
//   loading       {bool}
//   onSelect      {fn}      – kiválasztott gumi átadása (tire)
//   onClose       {fn}
//
// Dizájn: fehér kártyák, sötét szöveg – az app stílusát követi.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const WarehouseTireModal = ({
  visible,
  positionLabel,
  tires = [],
  loading = false,
  onSelect,
  onClose,
}) => {
  const renderItem = ({ item }) => {
    const title = [item.brand, item.model].filter(Boolean).join(" ") || "Ismeretlen gumi";
    const metaParts = [
      item.size,
      item.current_mm != null ? `${item.current_mm} mm` : null,
      item.current_bar != null ? `${item.current_bar} bar` : null,
    ].filter(Boolean);

    return (
      <TouchableOpacity
        style={styles.tireRow}
        onPress={() => onSelect?.(item)}
        activeOpacity={0.8}
      >
        <View style={styles.tireIcon}>
          <MaterialCommunityIcons name="tire" size={24} color="#0A2342" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tireTitle}>{title}</Text>
          <Text style={styles.tireMeta} numberOfLines={1}>
            {metaParts.length ? metaParts.join(" · ") : "Nincs adat"}
          </Text>
          {item.dot_number ? (
            <Text style={styles.tireDot}>DOT: {item.dot_number}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="plus-circle" size={26} color="#36e2c6" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* FEJLÉC */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Raktári gumik</Text>
              {positionLabel ? (
                <Text style={styles.subtitle}>Felszerelés ide: {positionLabel}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* TARTALOM */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#0A2342" size="large" />
              <Text style={styles.emptyText}>Raktár betöltése...</Text>
            </View>
          ) : tires.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nincs raktáron lévő gumi.</Text>
            </View>
          ) : (
            <FlatList
              data={tires}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default WarehouseTireModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A2342",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "700",
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  tireRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tireIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  tireTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2342",
  },
  tireMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  tireDot: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
});
