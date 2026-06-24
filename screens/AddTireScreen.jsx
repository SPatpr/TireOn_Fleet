// =============================================================
// Gumi hozzáadása képernyő
//
// Navigációs paraméterek (route.params):
//   vehicleId   {string}  – kötelező
//   plateNumber {string}  – megjelenítési célra
//   position    {string}  – opcionális előválasztott pozíció (pl. "FL")
//
// 📦 TELEPÍTÉSI ÖSSZEFOGLALÓ:
//   OPCIÓ A – expo-image-picker  → már telepítve ✓
//   OPCIÓ B – expo-camera        → npx expo install expo-camera
//   OPCIÓ C – expo-camera        → npx expo install expo-camera
//             (produkciós OCR-hez: @react-native-ml-kit/text-recognition)
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";       // OPCIÓ A – már telepítve
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { addNewTire, uploadTirePhoto } from "../api/tireAPI";
import BarcodeScannerModal from "../components/BarcodeScannerModal"; // OPCIÓ B
import OCRCameraModal from "../components/OCRCameraModal";           // OPCIÓ C
import { DEFAULT_TIRE_LIMITS, validateTireValues } from "../lib/tireLimits";
import { getTrailerLayout } from "./tires/components/TrailerBlueprint";

// ─────────────────────────────────────────────────────────────
// Konstansok
// ─────────────────────────────────────────────────────────────

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

const COMMON_SIZES = [
  "315/80 R22.5", "295/80 R22.5", "385/65 R22.5",
  "315/70 R22.5", "245/70 R17.5", "Egyéb méret",
];

const ACC  = "#39e6ff";
const DARK = "#050c18";

// ─────────────────────────────────────────────────────────────

const AddTireScreen = ({ navigation, route }) => {
  const vehicleId   = route?.params?.vehicleId   ?? null;
  const plateNumber = route?.params?.plateNumber ?? "Ismeretlen";
  const initPos     = route?.params?.position    ?? null;
  const vehicleType = route?.params?.vehicleType ?? null;
  const axleCount   = route?.params?.axleCount ?? 2;
  const POSITIONS   = getPositionsFor(vehicleType, axleCount);

  // Form state
  const [position,     setPosition]     = useState(initPos);
  const [brand,        setBrand]        = useState("");
  const [customBrand,  setCustomBrand]  = useState("");
  const [model,        setModel]        = useState("");
  const [size,         setSize]         = useState("");
  const [customSize,   setCustomSize]   = useState("");
  const [dotNumber,    setDotNumber]    = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [barcode,      setBarcode]      = useState("");
  const [treadMm,      setTreadMm]      = useState("");
  const [pressureBar,  setPressureBar]  = useState("");
  const [note,         setNote]         = useState("");

  // Fotó (Opció A)
  const [photoUri,    setPhotoUri]    = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoMime,   setPhotoMime]   = useState("image/jpeg");

  // Modal láthatóság
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false); // Opció B
  const [showOCRCamera,      setShowOCRCamera]      = useState(false); // Opció C

  // UI state
  const [isSaving,      setIsSaving]      = useState(false);
  const [showBrands,    setShowBrands]    = useState(false);
  const [showSizes,     setShowSizes]     = useState(false);
  const scrollRef = useRef(null);

  // ──────────────────────────────────────────────────────────
  // OPCIÓ A – Egyszerű fotókészítés / képtár
  // ──────────────────────────────────────────────────────────
  // Kamera kinyitása és kép base64-ben való visszaadása,
  // amit a mentéskor uploadTirePhoto() tölt fel Supabase Storage-ba.
  // ──────────────────────────────────────────────────────────
  const handleOptionA_Photo = async () => {
    try {
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Kamera engedély szükséges",
          "Engedélyezd a kamera hozzáférést a beállításokban, majd próbáld újra."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.75,
        base64: true,
        allowsEditing: false,
        exif: false,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64);
        setPhotoMime(asset.mimeType ?? "image/jpeg");
      }
    } catch (err) {
      Alert.alert("Hiba", "Nem sikerült a fotó elkészítése.");
    }
  };
  // --- OPCIÓ A VÉGE ---

  // ──────────────────────────────────────────────────────────
  // OPCIÓ B – Vonalkód / QR-kód beolvasás
  // ──────────────────────────────────────────────────────────
  // A BarcodeScannerModal visszaadja a beolvasott értéket,
  // amit a sorozatszám / belső kód mezőbe töltünk be.
  // ──────────────────────────────────────────────────────────
  const handleOptionB_BarcodeDetected = (value) => {
    setBarcode(value);
    setSerialNumber(value);
    setShowBarcodeScanner(false);
    Alert.alert(
      "Vonalkód beolvasva",
      `Beolvasott kód: ${value}\n\nA sorozatszám és belső kód mezőkbe beírtuk. Ellenőrizd és javítsd, ha szükséges!`,
      [{ text: "OK" }]
    );
  };
  // --- OPCIÓ B VÉGE ---

  // ──────────────────────────────────────────────────────────
  // OPCIÓ C – DOT / méret szövegfelismerés (OCR váz)
  // ──────────────────────────────────────────────────────────
  // Az OCRCameraModal visszaadja a { dot, size } objektumot,
  // amit automatikusan beírunk a megfelelő mezőkbe.
  // ──────────────────────────────────────────────────────────
  const handleOptionC_OCRResult = ({ dot, size: detectedSize }) => {
    if (dot)           setDotNumber(dot);
    if (detectedSize)  setSize(detectedSize);
    setShowOCRCamera(false);
    if (dot || detectedSize) {
      Alert.alert(
        "Felismert adatok betöltve",
        `${dot ? `DOT: ${dot}\n` : ""}${detectedSize ? `Méret: ${detectedSize}` : ""}\n\nKérlek ellenőrizd a gumifalon!`,
        [{ text: "OK" }]
      );
    }
  };
  // --- OPCIÓ C VÉGE ---

  // ──────────────────────────────────────────────────────────
  // MENTÉS
  // ──────────────────────────────────────────────────────────
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

    // Kliensoldali biztonsági tartomány-validáció (fix dev-limitek)
    const { valid, errors } = validateTireValues(
      { pressureBar, treadMm },
      DEFAULT_TIRE_LIMITS,
    );
    if (!valid) {
      Alert.alert("Érvénytelen érték", errors.pressure || errors.tread);
      return;
    }

    setIsSaving(true);
    try {
      const effectiveBrand = brand === "Egyéb" ? customBrand : brand;
      const effectiveSize  = size  === "Egyéb méret" ? customSize : size;

      const savedTire = await addNewTire(vehicleId, {
        position,
        brand:        effectiveBrand || null,
        model:        model          || null,
        size:         effectiveSize  || null,
        dotNumber:    dotNumber      || null,
        serialNumber: serialNumber   || null,
        barcode:      barcode        || null,
        treadMm:      treadMm        || null,
        pressureBar:  pressureBar    || null,
        note:         note           || null,
      });

      // Ha van fotó (Opció A), feltöltjük Supabase Storage-ba
      if (photoBase64 && savedTire?.id) {
        await uploadTirePhoto(savedTire.id, vehicleId, photoBase64, photoMime);
      }

      Alert.alert(
        "Gumi elmentve",
        `${effectiveBrand || "Gumi"} sikeresen hozzáadva a ${position} pozícióba.`,
        [{ text: "OK", onPress: () => navigation?.goBack() }]
      );
    } catch (err) {
      Alert.alert("Mentési hiba", err.message || "Ismeretlen hiba történt.");
    } finally {
      setIsSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
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

          {/* ── KAMERA OPCIÓK KÁRTYA ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Beolvasás kamerával</Text>
            <Text style={styles.cardSubtitle}>
              Válassz az alábbi módok közül az adatok gyors rögzítéséhez
            </Text>

            <View style={styles.cameraOptions}>

              {/* OPCIÓ A */}
              <TouchableOpacity
                style={[styles.cameraBtn, photoUri && styles.cameraBtnActive]}
                onPress={handleOptionA_Photo}
                activeOpacity={0.75}
              >
                <View style={[styles.cameraBtnIcon, photoUri && styles.cameraBtnIconActive]}>
                  <MaterialCommunityIcons
                    name={photoUri ? "check-circle" : "camera"}
                    size={26}
                    color={photoUri ? "#36e2c6" : "#0A2342"}
                  />
                </View>
                <Text style={styles.cameraBtnLabel}>Fotó</Text>
                <Text style={styles.cameraBtnSub}>A opció</Text>
              </TouchableOpacity>

              {/* OPCIÓ B */}
              <TouchableOpacity
                style={[styles.cameraBtn, barcode && styles.cameraBtnActive]}
                onPress={() => setShowBarcodeScanner(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.cameraBtnIcon, barcode && styles.cameraBtnIconActive]}>
                  <MaterialCommunityIcons
                    name={barcode ? "check-circle" : "barcode-scan"}
                    size={26}
                    color={barcode ? "#36e2c6" : "#0A2342"}
                  />
                </View>
                <Text style={styles.cameraBtnLabel}>Vonalkód</Text>
                <Text style={styles.cameraBtnSub}>B opció</Text>
              </TouchableOpacity>

              {/* OPCIÓ C */}
              <TouchableOpacity
                style={[styles.cameraBtn, dotNumber && styles.cameraBtnActive]}
                onPress={() => setShowOCRCamera(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.cameraBtnIcon, dotNumber && styles.cameraBtnIconActive]}>
                  <MaterialCommunityIcons
                    name={dotNumber ? "check-circle" : "text-recognition"}
                    size={26}
                    color={dotNumber ? "#36e2c6" : "#0A2342"}
                  />
                </View>
                <Text style={styles.cameraBtnLabel}>DOT OCR</Text>
                <Text style={styles.cameraBtnSub}>C opció</Text>
              </TouchableOpacity>
            </View>

            {/* Fotó előnézet (Opció A után) */}
            {photoUri && (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImg} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => { setPhotoUri(null); setPhotoBase64(null); }}
                >
                  <MaterialCommunityIcons name="close-circle" size={22} color="#ff5169" />
                </TouchableOpacity>
                <Text style={styles.photoLabel}>
                  Fotó rögzítve – feltöltés mentéskor
                </Text>
              </View>
            )}
          </View>

          {/* ── POZÍCIÓ VÁLASZTÓ KÁRTYA ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Kerékpozíció{" "}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.positionGrid}>
              {POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.posBtn,
                    position === p.id && styles.posBtnActive,
                  ]}
                  onPress={() => setPosition(p.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.posBtnId,
                      position === p.id && styles.posBtnIdActive,
                    ]}
                  >
                    {p.id}
                  </Text>
                  <Text
                    style={[
                      styles.posBtnLabel,
                      position === p.id && styles.posBtnLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── GUMI ADATAI KÁRTYA ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gumi adatai</Text>

            {/* Gyártó */}
            <Text style={styles.fieldLabel}>Gyártó</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {BRANDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, brand === b && styles.chipActive]}
                  onPress={() => setBrand(b)}
                >
                  <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>
                    {b}
                  </Text>
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

            {/* Típus */}
            <Text style={styles.fieldLabel}>Típus / Modell</Text>
            <TextInput
              style={styles.textInput}
              value={model}
              onChangeText={setModel}
              placeholder="pl. X Multi Energy"
              placeholderTextColor="#94a3b8"
            />

            {/* Méret */}
            <Text style={styles.fieldLabel}>Méret</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {COMMON_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, size === s && styles.chipActive]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.chipText, size === s && styles.chipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {size === "Egyéb méret" && (
              <TextInput
                style={[styles.textInput, { marginTop: 6 }]}
                value={customSize}
                onChangeText={setCustomSize}
                placeholder="pl. 265/70 R19.5"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            )}

            {/* DOT szám – auto-tölthető C opcióból */}
            <Text style={styles.fieldLabel}>
              DOT szám
              {dotNumber ? (
                <Text style={styles.fieldHint}> · OCR-ből beírva – ellenőrizd!</Text>
              ) : null}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={dotNumber}
                onChangeText={setDotNumber}
                placeholder="pl. DOT U2LL LMLR 2224"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            </View>

            {/* Sorozatszám – auto-tölthető vonalkódból vagy OCR kamerából */}
            <Text style={styles.fieldLabel}>
              Sorozatszám / Belső kód
              {barcode ? (
                <Text style={styles.fieldHint}> · vonalkódból beírva</Text>
              ) : null}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={serialNumber}
                onChangeText={(v) => { setSerialNumber(v); setBarcode(v); }}
                placeholder="pl. MCH-2024-00441"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
              {/* OCR – gyári szám beolvasása kamerával (Google Vision) */}
              <TouchableOpacity
                style={styles.scanBtn}
                activeOpacity={0.8}
                onPress={() =>
                  navigation?.navigate("TireCameraScan", {
                    onScanned: (r) => {
                      if (r?.serial) { setSerialNumber(r.serial); setBarcode(r.serial); }
                    },
                  })
                }
              >
                <MaterialCommunityIcons name="line-scan" size={22} color="#0A2342" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── MÉRT ÉRTÉKEK KÁRTYA ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Mért értékek{" "}
              <Text style={styles.required}>*</Text>
            </Text>
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

          {/* ── MEGJEGYZÉS ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Megjegyzés (opcionális)</Text>
            <TextInput
              style={[styles.textInput, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="pl. szállítólevél: 2026-06-10/44"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── MENTÉS GOMB ── */}
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

      {/* ── OPCIÓ B MODAL ── */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onDetected={handleOptionB_BarcodeDetected}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* ── OPCIÓ C MODAL ── */}
      <OCRCameraModal
        visible={showOCRCamera}
        onDotDetected={handleOptionC_OCRResult}
        onClose={() => setShowOCRCamera(false)}
      />
    </SafeAreaView>
  );
};

export default AddTireScreen;

// ─────────────────────────────────────────────────────────────
// STÍLUSOK
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DARK },
  // Fejléc
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
  headerSub: {
    color: "#475569",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  // Kártyák – fehér háttér kontrasztos szöveggel
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
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2342",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -6,
  },
  // Kamera opció gombok
  cameraOptions: { flexDirection: "row", gap: 10 },
  cameraBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 6,
  },
  cameraBtnActive: {
    borderColor: "#36e2c6",
    backgroundColor: "rgba(54,226,198,0.06)",
  },
  cameraBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtnIconActive: {
    backgroundColor: "rgba(54,226,198,0.15)",
  },
  cameraBtnLabel: { fontSize: 13, fontWeight: "700", color: "#0A2342" },
  cameraBtnSub:   { fontSize: 10, color: "#94a3b8", letterSpacing: 0.3 },
  // Fotó előnézet
  photoPreview: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 4,
  },
  photoImg: { width: "100%", height: 160 },
  photoRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 11,
  },
  photoLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "white",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 6,
  },
  // Pozíció gombok
  positionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  posBtnActive: {
    borderColor: "#0A2342",
    backgroundColor: "#0A2342",
  },
  posBtnId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A2342",
    letterSpacing: 0.5,
  },
  posBtnIdActive: { color: "white" },
  posBtnLabel: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },
  posBtnLabelActive: { color: "rgba(255,255,255,0.75)" },
  // Chip sor
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
  chipText:   { fontSize: 13, color: "#475569", fontWeight: "600" },
  chipTextActive: { color: "white" },
  // Szöveg mezők
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    marginTop: 6,
  },
  fieldHint: { color: "#f59e0b", fontSize: 11, fontWeight: "500" },
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
  noteInput: { minHeight: 72, textAlignVertical: "top" },
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
  // Mért értékek
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
  // Mentés gomb
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
