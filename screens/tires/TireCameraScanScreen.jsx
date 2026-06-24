// =============================================================
// TireCameraScanScreen – gyári/szériaszám beolvasása kamerával
//
// Élőkép + célkereszt overlay + vaku-kapcsoló. Fotó után a kép a
// privát tire-scans bucketbe kerül, majd az ocr-tire-serial Edge
// Function (Google Vision) visszaadja a felismert gyári számot.
//
// Navigációs paraméter:
//   onScanned {fn}  – callback(result) a felismert adattal; a screen
//                     a hívás után visszanavigál.
//
// 💡 A vaku FERDE árnyékhatása drasztikusan növeli a pontosságot a
//    dombornyomott, alacsony kontrasztú betűknél.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { scanTireSerial } from "../../api/tireAPI";

const TireCameraScanScreen = ({ navigation, route }) => {
  const onScanned = route?.params?.onScanned;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current || processing) return;
    try {
      setProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
      });

      const result = await scanTireSerial(photo.base64, "image/jpeg");

      if (result?.serial) {
        onScanned?.(result);
        navigation?.goBack();
      } else {
        Alert.alert(
          "Nem sikerült felismerni",
          "Nem találtam egyértelmű gyári számot. Próbáld újra ferde vakufénnyel, közelebbről.",
          [{ text: "Újra" }],
        );
        setProcessing(false);
      }
    } catch (err) {
      Alert.alert("Hiba", err.message || "Nem sikerült a beolvasás.");
      setProcessing(false);
    }
  };

  // Engedély véglegesen megtagadva
  if (permission && !permission.granted && !permission.canAskAgain) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="camera-off" size={56} color="#ff5169" />
        <Text style={styles.deniedTitle}>Kamera hozzáférés megtagadva</Text>
        <Text style={styles.deniedText}>Engedélyezd a kamerát a telefon Beállításaiban.</Text>
        <TouchableOpacity style={styles.backBtnLg} onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtnLgText}>Vissza</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission?.granted && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
        />
      )}

      {/* ── CÉLKERESZT / OVERLAY ── */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guideFrame}>
          {/* sarokjelölők */}
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
          <View style={styles.scanLine} />
        </View>
        <Text style={styles.guideHint}>
          Igazítsd a gyári számot a keretbe{"\n"}Világíts OLDALRÓL a dombornyomáshoz
        </Text>
      </View>

      {/* ── FEJLÉC ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.iconBtn} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gyári szám beolvasása</Text>
        {/* VAKU KAPCSOLÓ */}
        <TouchableOpacity onPress={() => setTorch((t) => !t)} style={styles.iconBtn} hitSlop={10}>
          <MaterialCommunityIcons
            name={torch ? "flashlight" : "flashlight-off"}
            size={26}
            color={torch ? "#39e6ff" : "white"}
          />
        </TouchableOpacity>
      </View>

      {/* ── FOTÓ GOMB ── */}
      <View style={styles.captureRow}>
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={processing}>
          <View style={styles.captureRing}>
            <View style={styles.captureInner} />
          </View>
        </TouchableOpacity>
        <Text style={styles.captureHint}>Fotó a gumifalról</Text>
      </View>

      {/* ── FELDOLGOZÁS OVERLAY ── */}
      {processing && (
        <View style={styles.processing}>
          <ActivityIndicator size="large" color="#39e6ff" />
          <Text style={styles.processingText}>Feldolgozás…</Text>
          <Text style={styles.processingSub}>Gyári szám keresése (Google Vision)</Text>
        </View>
      )}
    </View>
  );
};

export default TireCameraScanScreen;

const ACC = "#39e6ff";
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050c18" },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  deniedTitle: { color: "white", fontSize: 19, fontWeight: "700", textAlign: "center" },
  deniedText: { color: "#94a3b8", fontSize: 14, textAlign: "center" },
  backBtnLg: {
    marginTop: 12, backgroundColor: "#0A2342", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  backBtnLgText: { color: "white", fontWeight: "700" },

  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  guideFrame: {
    width: 300,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.35)",
  },
  corner: { position: "absolute", width: 24, height: 24, borderColor: ACC },
  cTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  scanLine: {
    position: "absolute",
    left: 10, right: 10, top: "50%",
    height: 2,
    backgroundColor: "rgba(57,230,255,0.7)",
  },
  guideHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
  },

  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "rgba(5,12,24,0.35)",
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "700" },

  captureRow: { position: "absolute", bottom: 48, left: 0, right: 0, alignItems: "center", gap: 10 },
  captureBtn: { alignItems: "center", justifyContent: "center" },
  captureRing: {
    width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "white",
    alignItems: "center", justifyContent: "center",
  },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "white" },
  captureHint: { color: "rgba(255,255,255,0.7)", fontSize: 13 },

  processing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,12,24,0.8)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  processingText: { color: "white", fontSize: 18, fontWeight: "700" },
  processingSub: { color: "#94a3b8", fontSize: 14 },
});
