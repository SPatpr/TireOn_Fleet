import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ENUM_LABELS } from "../constans";

const EmployeeListItem = ({ item }) => {
  // Telefonszám hívása funkció
  const makeCall = async () => {
    if (!item.phone_number) {
      Alert.alert("Nincs telefonszám", "Ehhez az alkalmazotthoz nincs telefonszám rögzítve.");
      return;
    }
    try {
      await Linking.openURL(`tel:${item.phone_number}`);
    } catch {
      Alert.alert("Hiba", "Nem sikerült megnyitni a telefon alkalmazást.");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {/* AVATAR - Ha nincs kép, egy alapértelmezett ikont mutatunk */}
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <FontAwesome5 name="user" size={24} color="#0A2342" />
          </View>
        )}

        <View style={styles.infoContainer}>
          {/* NÉV - Az adatbázisból: full_name */}
          <Text style={styles.nameText}>
            {item.full_name || "Névtelen alkalmazott"}
          </Text>

          <View style={styles.roleRow}>
            {/* POZÍCIÓ - A konstans fájlból kérjük le a magyar megfelelőt */}
            <Text style={styles.roleText}>
              {ENUM_LABELS.hu.user_role[item.role] || item.role}
            </Text>

            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#64748b"
              style={{ marginLeft: 4 }}
            />
          </View>

          {/* TELEFONSZÁM VAGY JÁRMŰ */}
          <View style={styles.subRow}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={16}
              color="#64748b"
            />
            <Text style={styles.subText}>
              {item.phone_number || "Nincs megadva"}
            </Text>
          </View>
        </View>

        {/* HÍVÁS GOMB */}
        <TouchableOpacity style={styles.phoneButton} onPress={makeCall}>
          <MaterialCommunityIcons name="phone" size={24} color="#0A2342" />
        </TouchableOpacity>
      </View>

      {/* STÁTUSZ BADGE - Az adatbázisból: status */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: item.status === "active" ? "#22c55e" : "#94a3b8" },
        ]}
      >
        <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
      </View>
    </View>
  );
};

export default EmployeeListItem;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 15 },
  placeholderAvatar: {
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoContainer: { flex: 1 },
  nameText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2342",
    marginBottom: 2,
  },
  roleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  roleText: { fontSize: 14, color: "#64748b", textTransform: "capitalize" },
  subRow: { flexDirection: "row", alignItems: "center" },
  subText: { fontSize: 13, marginLeft: 6, color: "#64748b" },
  phoneButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: "white", fontWeight: "bold", fontSize: 10 },
});
