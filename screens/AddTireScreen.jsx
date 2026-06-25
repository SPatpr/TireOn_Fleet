// =============================================================
// Gumi hozzáadása képernyő – MINIMALIZÁLT
//
// Egyetlen kamerás funkció: a gyári/szériaszám Google Vision OCR-rel
// (a Sorozatszám mező melletti szkenner-gomb → TireCameraScan).
// Mezők: Gyártó/Típus, Gyári szám, Nyomás (bar), Profilmélység (mm).
//
// route.params: vehicleId, plateNumber, position?, vehicleType?, axleCount?
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addNewTire } from "../api/tireAPI";
import { DEFAULT_TIRE_LIMITS, validateTireValues } from "../lib/tireLimits";
import { getTrailerLayout } from "./tires/components/TrailerBlueprint";

// Kamion pozíció-rács (6 kerék)
const TRUCK_POSITIONS = [
  { id: "FL",  label: "Bal\nElső" },
  { id: "FR",  label: "Jobb\nElső" },
  { id: "RL1", label: "Bal H.\nBelső" },
  { id: "RL2", label: "Bal H.\nKülső" },
  { id: "RR1", label: "Jobb H.\nBelső" },
  { id: "RR2", label: "Jobb H.\nKülső" },
];

// Pótkocsinál a pozíciók a tengelyszámból generálódnak (1/2/3 tengely).
const getPositionsFor = (vehicleType, axleCount) => {
  if ((vehicleType ?? "").startsWith("trailer")) {
    return Object.entries(getTrailerLayout(axleCount).labels).map(([id, label]) => ({
      id,
      label: label.replace(" ", "\n"),
    }));
  }
  return TRUCK_POSITIONS;
};

const BRANDS = [
  "Michelin", "Continental", "Bridgestone",
  "Goodyear", "Pirelli", "Hankook",
  "Yokohama", "Kumho", "Egyéb",
];

const DARK = "#050c18";

const AddTireScreen = ({ navigation, route }) => {
  const vehicleId   = route?.params?.vehicleId   ?? null;
  const plateNumber = route?.params?.plateNumber ?? "Ismeretlen";
  const initPos     = route?.params?.position    ?? null;
  const vehicleType = route?.params?.vehicleType ?? null;
  const axleCount   = route?.params?.axleCount ?? 2;
  const POSITIONS   = getPositionsFor(vehicleType, axleCount);

  const [position,     setPosition]     = useState(initPos);
  const [brand,        setBrand]        = useState("");
  const [customBrand,  setCustomBrand]  = useState("");
  const [model,        setModel]        = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [treadMm,      setTreadMm]      = useState("");
  const [pressureBar,  setPressureBar]  = useState("");
  const [isSaving,     setIsSaving]     = useState(false);
  const scrollRef = useRef(null);

  const handleSave = async () => {
    if (!vehicleId) {
      Alert.alert("Hiba", "Jármű azonosítója hiányzik.");
      return;
    }
    if (!position) {
      Alert.alert("Hiányzó adat", "Kérlek válassz kerékpozíciót!");
      return;
    }
    if (!treadMm && !pressureBar) {
      Alert.alert("Hiányzó adat", "Add meg legalább a profilmélységet vagy a légnyomást!");
      return;
    }

    const { valid, errors } = validateTireValues({ pressureBar, treadMm }, DEFAULT_TIRE_LIMITS);
    if (!valid) {
      Alert.alert("Érvénytelen érték", errors.pressure || errors.tread);
      return;
    }

    setIsSaving(true);
    try {
      const effectiveBrand = brand === "Egyéb" ? customBrand : brand;
      await addNewTire(vehicleId, {
        position,
        brand:        effectiveBrand || null,
        model:        model          || null,
        serialNumber: serialNumber   || null,
        treadMm:      treadMm        || null,
        pressureBar:  pressureBar    || null,
      });

      Alert.alert(
        "Gumi elmentve",
        `${effectiveBrand || "Gumi"} sikeresen hozzáadva a ${position} pozícióba.`,
        [{ text: "OK", onPress: () => navigation?.goBack() }],
      );
    } catch (err) {
      Alert.alert("Mentési hiba", err.message || "Ismeretlen hiba történt.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* FEJLÉC */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Gumi hozzáadása</Text>
            <Text style={styles.headerSub}>{plateNumber}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── POZÍCIÓ VÁLASZTÓ ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kerékpozíció <Text style={styles.required}>*</Text></Text>
            <View style={styles.positionGrid}>
              {POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.posBtn, position === p.id && styles.posBtnActive]}
                  onPress={() => setPosition(p.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.posBtnId, position === p.id && styles.posBtnIdActive]}>{p.id}</Text>
                  <Text style={[styles.posBtnLabel, position === p.id && styles.posBtnLabelActive]} numberOfLines={2}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── GUMI ADATAI ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gumi adatai</Text>

            {/* Gyártó */}
            <Text style={styles.fieldLabel}>Gyártó</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {BRANDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, brand === b && styles.chipActive]}
                  onPress={() => setBrand(b)}
                >
                  <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {brand === "Egyéb" && (
              <TextInput
                style={[styles.textInput, { marginTop: 6 }]}
                value={customBrand}
                onChangeText={setCustomBrand}
                placeholder="Gyártó neve..."
                placeholderTextColor="#94a3b8"
              />
            )}

            {/* Típus / Modell */}
            <Text style={styles.fieldLabel}>Típus / Modell</Text>
            <TextInput
              style={styles.textInput}
              value={model}
              onChangeText={setModel}
              placeholder="pl. X Multi Energy"
              placeholderTextColor="#94a3b8"
            />

            {/* Gyári szám – OCR-rel segítve */}
            <Text style={styles.fieldLabel}>Gyári szám</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="pl. MCH-2024-00441"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
              {/* Google Vision OCR – gyári szám beolvasása kamerával */}
              <TouchableOpacity
                style={styles.scanBtn}
                activeOpacity={0.8}
                onPress={() =>
                  navigation?.navigate("TireCameraScan", {
                    onScanned: (r) => { if (r?.serial) setSerialNumber(r.serial); },
                  })
                }
              >
                <MaterialCommunityIcons name="line-scan" size={22} color="#0A2342" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── MÉRT ÉRTÉKEK ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mért értékek <Text style={styles.required}>*</Text></Text>
            <Text style={styles.cardSubtitle}>Legalább egy mező kitöltése kötelező</Text>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Profilmélység</Text>
                <View style={styles.measureInput}>
                  <TextInput
                    style={styles.measureTextInput}
                    value={treadMm}
                    onChangeText={setTreadMm}
                    placeholder="8.5"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unit}>mm</Text>
                </View>
              </View>

              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Légnyomás</Text>
                <View style={styles.measureInput}>
                  <TextInput
                    style={styles.measureTextInput}
                    value={pressureBar}
                    onChangeText={setPressureBar}
                    placeholder="9.0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unit}>bar</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── MENTÉS ── */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={20} color="white" />
                <Text style={styles.saveBtnText}>Gumi mentése</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddTireScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  backBtn: { marginRight: 10 },
  headerText: { flex: 1 },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0A2342", marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: "#64748b", marginTop: -6 },
  positionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  posBtn: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  posBtnActive: { borderColor: "#0A2342", backgroundColor: "#0A2342" },
  posBtnId: { fontSize: 16, fontWeight: "800", color: "#0A2342", letterSpacing: 0.5 },
  posBtnIdActive: { color: "white" },
  posBtnLabel: { fontSize: 10, color: "#64748b", textAlign: "center", lineHeight: 14, marginTop: 2 },
  posBtnLabelActive: { color: "rgba(255,255,255,0.75)" },
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
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#64748b", marginBottom: 4, marginTop: 6 },
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
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0A2342",
    backgroundColor: "rgba(10,35,66,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  measureRow: { flexDirection: "row", gap: 12 },
  measureField: { flex: 1, gap: 4 },
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
    height: 54,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: "#0A2342",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: "white", fontSize: 17, fontWeight: "700" },
  required: { color: "#ef4444" },
});
