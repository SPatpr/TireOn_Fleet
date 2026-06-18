import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ENUM_LABELS } from "../constans.js";

const STATUS_COLORS = {
  active:      "#16a34a",
  maintenance: "#d97706",
  inactive:    "#64748b",
};

// Járműtípus → MaterialCommunityIcons ikon (a trailer_* legacy is ide esik)
const typeIcon = (type) => {
  if (type === "car") return "car";
  if ((type ?? "").startsWith("trailer")) return "truck-trailer";
  return "truck";
};

// Járműtípus → magyar felirat (legacy trailer_1/2/3 is kezelve)
const typeLabel = (type) => ENUM_LABELS.hu.vehicle_type[type] || type || "Ismeretlen";

const TruckListItem = ({ brand, model, plate, status, type, onPress }) => {
  const translatedStatus = ENUM_LABELS.hu.vehicle_status[status] || status;
  const statusColor = STATUS_COLORS[status] ?? "#dc2626";

  const title = [brand, model].filter(Boolean).join(" ") || "Ismeretlen jármű";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* IKON: típus szerint dinamikus (kamion / pótkocsi / autó) */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={typeIcon(type)} size={26} color="#1e40af" />
      </View>

      {/* RÉSZLETEK */}
      <View style={styles.detailsContainer}>
        {/* JAVÍTVA: A szöveg sötétkék/fekete lett, hogy olvasható legyen a fehér kártyán */}
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>

        {/* RENDSZÁM + TÍPUS */}
        <View style={styles.metaRow}>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{plate || "Nincs rendszám"}</Text>
          </View>
          <View style={styles.typeBadge}>
            <MaterialCommunityIcons name={typeIcon(type)} size={13} color="#1e40af" />
            <Text style={styles.typeText}>{typeLabel(type)}</Text>
          </View>
        </View>

        {/* STÁTUSZ */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {translatedStatus}
          </Text>
        </View>
      </View>

      {/* A nyíl ikon is kapott egy határozottabb szürkét a jobb láthatóságért */}
      <MaterialCommunityIcons name="chevron-right" size={24} color="#475569" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff", // ÚJ: Hófehér kártya háttér
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0", // Finom szürke szegély
    // Erősebb, prémium árnyékok a sötét háttérből való kiemelkedéshez
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#f1f5f9", // ÚJ: Világos szürkéskék ikon-doboz
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailsContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a", // ÚJ: Nagyon sötét pala/fekete szövegszín
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  plateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  plateText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  typeText: {
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
});

export default TruckListItem;
