// =============================================================
// OPCIÓ C – DOT szám / méret felismerő (OCR) kamera modal
//
// Hogyan működik:
//   1. Megnyitja a kamerát (expo-camera)
//   2. A felhasználó ráfogja a gumifal feliratára és fotót készít
//   3. A kép base64 adatán DOT regex futtatódik (kliens oldal)
//   4. Ha felismert egy DOT mintát, automatikusan kitölti a mezőt
//   5. Sikertelen felismerés esetén kézi beviteli lehetőség jelenik meg
//
// PRODUKCIÓS OCR FEJLESZTÉSI IRÁNYOK (megjegyzésben):
//   • @react-native-ml-kit/text-recognition  ← Google ML Kit, offline
//   • Supabase Edge Function + Google Cloud Vision API  ← szerver oldali
//   • expo-ml-kit-text-recognition  ← ha elérhetővé válik
//
// 📦 SZÜKSÉGES CSOMAG:
//      npx expo install expo-camera
//
// Props:
//   visible        {boolean}  – modal látható-e
//   onDotDetected  {function} – callback({ dot, size }) – felismert adatokkal
//   onClose        {function} – bezárás / mégse
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- OPCIÓ C KEZDETE ---

// DOT szám regex minták
// Pl.: "DOT U2LL LMLR 2224"  →  4 betű-szám blokk, utolsó 4 = WWYY (hét + év)
const DOT_PATTERNS = [
  /DOT\s+([A-Z0-9]{4})\s+([A-Z0-9]{4})\s+([A-Z0-9]{4})/i,
  /DOT\s+([A-Z0-9]{2,4})\s+([A-Z0-9]{2,4})\s+([A-Z0-9]{4})/i,
  /DOT([A-Z0-9\s]{8,17})/i,
];

// Gumiméret regex – pl. "315/80R22.5" vagy "315/80 R22.5"
const SIZE_PATTERN = /(\d{3}\/\d{2,3}\s?[Rr]\d{2}(?:\.\d)?)/;

// Kliensoldali "OCR" – valós base64 képen egyelőre nem fut szövegfelismerést,
// csak a regex-eket futtatja le a fájlnévre / metaadatra (skeleton).
// Produkciós használathoz cseréld ki @react-native-ml-kit/text-recognition hívásra.
const runClientOCR = async (base64Image) => {
  // --- PRODUKCIÓS CSERE PONT ---
  // Ha telepítetted: npx expo install @react-native-ml-kit/text-recognition
  // akkor töröld ki az összes alábbi kódot és használd ezt:
  //
  // import TextRecognition from "@react-native-ml-kit/text-recognition";
  // const result = await TextRecognition.recognize(`data:image/jpeg;base64,${base64Image}`);
  // const fullText = result.blocks.map(b => b.text).join(" ");
  // const dotMatch = DOT_PATTERNS.reduce((m, p) => m || fullText.match(p), null);
  // const sizeMatch = fullText.match(SIZE_PATTERN);
  // return {
  //   dot:  dotMatch  ? dotMatch[0].replace(/\s+/g, ' ').trim() : null,
  //   size: sizeMatch ? sizeMatch[0].trim()                      : null,
  //   rawText: fullText,
  // };
  // --- PRODUKCIÓS CSERE PONT VÉGE ---

  // Skeleton szimuláció: 1.5 mp "feldolgozás" után null eredményt ad vissza,
  // hogy megjelenjen a kézi beviteli fallback.
  await new Promise((r) => setTimeout(r, 1500));
  return { dot: null, size: null, rawText: null };
};

// ─────────────────────────────────────────────────────────────

const OCRCameraModal = ({ visible, onDotDetected, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef                       = useRef(null);

  const [phase, setPhase]     = useState("camera");  // "camera" | "processing" | "result" | "manual"
  const [capturedUri, setCapturedUri]   = useState(null);
  const [capturedB64, setCapturedB64]   = useState(null);
  const [ocrResult, setOcrResult]       = useState(null);
  const [manualDot, setManualDot]       = useState("");
  const [manualSize, setManualSize]     = useState("");

  useEffect(() => {
    if (visible) {
      setPhase("camera");
      setCapturedUri(null);
      setCapturedB64(null);
      setOcrResult(null);
      setManualDot("");
      setManualSize("");
    }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });
      setCapturedUri(photo.uri);
      setCapturedB64(photo.base64);
      setPhase("processing");

      const result = await runClientOCR(photo.base64);
      setOcrResult(result);

      if (result.dot || result.size) {
        setPhase("result");
      } else {
        setPhase("manual");
      }
    } catch (err) {
      Alert.alert("Hiba", "Nem sikerült a fotó elkészítése: " + err.message);
      setPhase("camera");
    }
  };

  const handleConfirmResult = () => {
    onDotDetected({
      dot:  ocrResult?.dot  || manualDot.trim()  || null,
      size: ocrResult?.size || manualSize.trim() || null,
    });
  };

  const handleManualConfirm = () => {
    if (!manualDot.trim() && !manualSize.trim()) {
      Alert.alert("Figyelem", "Legalább a DOT számot vagy a méretet add meg!");
      return;
    }
    onDotDetected({ dot: manualDot.trim() || null, size: manualSize.trim() || null });
  };

  // ── Engedély megtagadva ──
  if (permission && !permission.granted && !permission.canAskAgain) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={60} color="#ff5169" />
          <Text style={styles.permissionTitle}>Kamera hozzáférés megtagadva</Text>
          <Text style={styles.permissionText}>
            Engedélyezd a kamera hozzáférést a telefon Beállítások menüjében.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Bezárás</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        {/* ── FÁZIS: KAMERA ── */}
        {phase === "camera" && (
          <>
            {permission?.granted && (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                facing="back"
              />
            )}

            {/* Célkereszt / útmutató overlay */}
            <View style={styles.cameraGuide}>
              <View style={styles.guideFrame}>
                <Text style={styles.guideText}>
                  Fókuszálj a gumifal feliratára{"\n"}
                  (DOT szám, méretjelölés)
                </Text>
              </View>
            </View>

            {/* Fejléc */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtnWrap} onPress={onClose}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>DOT felismerés (OCR)</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Fotó gomb */}
            <View style={styles.captureRow}>
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                <View style={styles.captureRing}>
                  <View style={styles.captureInner} />
                </View>
              </TouchableOpacity>
              <Text style={styles.captureHint}>Fotó a gumifalról</Text>
            </View>
          </>
        )}

        {/* ── FÁZIS: FELDOLGOZÁS ── */}
        {phase === "processing" && (
          <View style={styles.processingContainer}>
            {capturedUri && (
              <Image source={{ uri: capturedUri }} style={styles.previewImg} resizeMode="cover" />
            )}
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#39e6ff" />
              <Text style={styles.processingText}>OCR feldolgozás folyamatban...</Text>
              <Text style={styles.processingSubtext}>
                DOT szám és méret keresése a képen
              </Text>
            </View>
          </View>
        )}

        {/* ── FÁZIS: SIKERES FELISMERÉS ── */}
        {phase === "result" && ocrResult && (
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <MaterialCommunityIcons name="text-recognition" size={48} color="#36e2c6" style={{ alignSelf: "center" }} />
            <Text style={styles.resultTitle}>Felismert adatok</Text>

            {capturedUri && (
              <Image source={{ uri: capturedUri }} style={styles.resultImg} resizeMode="cover" />
            )}

            {ocrResult.dot && (
              <View style={styles.detectedRow}>
                <Text style={styles.detectedLabel}>DOT szám:</Text>
                <Text style={styles.detectedValue}>{ocrResult.dot}</Text>
              </View>
            )}
            {ocrResult.size && (
              <View style={styles.detectedRow}>
                <Text style={styles.detectedLabel}>Méret:</Text>
                <Text style={styles.detectedValue}>{ocrResult.size}</Text>
              </View>
            )}

            <Text style={styles.resultNote}>
              Kérlek ellenőrizd a felismert adatokat a gumifalon lévő felirattal!
            </Text>

            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setPhase("camera")}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#39e6ff" />
                <Text style={styles.secondaryBtnText}>Újra fotózom</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmResult}>
                <MaterialCommunityIcons name="check" size={18} color="white" />
                <Text style={styles.primaryBtnText}>Elfogadom</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── FÁZIS: KÉZI BEVITELI FALLBACK (OCR nem ismert fel semmit) ── */}
        {phase === "manual" && (
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ffb648" style={{ alignSelf: "center" }} />
            <Text style={styles.resultTitle}>Nem sikerült automatikusan felismerni</Text>

            {capturedUri && (
              <Image source={{ uri: capturedUri }} style={styles.resultImg} resizeMode="cover" />
            )}

            <Text style={styles.manualHint}>
              A DOT szám a gumifal oldalán található, pl.:{"\n"}
              <Text style={{ fontFamily: "monospace", color: "#39e6ff" }}>
                DOT U2LL LMLR 2224
              </Text>
              {"\n"}
              Az utolsó 4 szám = gyártási hét + év (2224 = 22. hét, 2024)
            </Text>

            <Text style={styles.fieldLabel}>DOT szám (kézzel):</Text>
            <TextInput
              style={styles.textInput}
              value={manualDot}
              onChangeText={setManualDot}
              placeholder="pl. DOT U2LL LMLR 2224"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Méret (ha felismerhető):</Text>
            <TextInput
              style={styles.textInput}
              value={manualSize}
              onChangeText={setManualSize}
              placeholder="pl. 315/80 R22.5"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />

            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setPhase("camera")}
              >
                <MaterialCommunityIcons name="camera" size={18} color="#39e6ff" />
                <Text style={styles.secondaryBtnText}>Új fotó</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleManualConfirm}>
                <MaterialCommunityIcons name="check" size={18} color="white" />
                <Text style={styles.primaryBtnText}>Mentés</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Kihagyom, kézzel töltöm ki a formot</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// --- OPCIÓ C VÉGE ---

export default OCRCameraModal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050c18" },
  // Engedély megtagadva
  permissionContainer: {
    flex: 1,
    backgroundColor: "#050c18",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: { color: "white", fontSize: 20, fontWeight: "700", textAlign: "center" },
  permissionText:  { color: "#94a3b8", fontSize: 15, textAlign: "center", lineHeight: 22 },
  // Fejléc
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtnWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle:    { color: "white", fontSize: 18, fontWeight: "700" },
  // Kamera guide overlay
  cameraGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideFrame: {
    width: 300,
    height: 120,
    borderWidth: 1.5,
    borderColor: "rgba(57,230,255,0.5)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginTop: 60,
  },
  guideText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  // Fotó gomb
  captureRow: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  captureBtn: { alignItems: "center", justifyContent: "center" },
  captureRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
  },
  captureHint: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  // Feldolgozás
  processingContainer: { flex: 1 },
  previewImg: { flex: 1 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,12,24,0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  processingText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  processingSubtext: { color: "#94a3b8", fontSize: 14, textAlign: "center" },
  // Eredmény / kézi bevitel
  resultContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    gap: 14,
  },
  resultTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  resultImg: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  detectedRow: {
    backgroundColor: "rgba(57,230,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.2)",
    borderRadius: 10,
    padding: 12,
  },
  detectedLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  detectedValue: { color: "#39e6ff", fontSize: 20, fontWeight: "700", fontFamily: "monospace" },
  resultNote: { color: "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 19 },
  // Kézi bevitel
  manualHint: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
  },
  fieldLabel: { color: "#64748b", fontSize: 13, fontWeight: "600", marginTop: 4 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    fontFamily: "monospace",
  },
  skipLink: { alignItems: "center", paddingVertical: 12 },
  skipLinkText: { color: "#475569", fontSize: 13, textDecorationLine: "underline" },
  // Gombok
  resultButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0A2342",
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#39e6ff",
    paddingVertical: 13,
    borderRadius: 12,
  },
  secondaryBtnText: { color: "#39e6ff", fontWeight: "700", fontSize: 15 },
});
