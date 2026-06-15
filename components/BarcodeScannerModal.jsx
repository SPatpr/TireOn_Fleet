// =============================================================
// OPCIÓ B – Vonalkód / QR-kód olvasó modal
//
// Mikor hasznos:
//   • Új gumi szállításakor a gyártói/kereskedői cédulán lévő
//     vonalkód / QR-kód beolvasásával automatikusan kitölti a
//     sorozatszám / belső kód mezőt.
//   • Ha a cég saját QR-matricákat ragaszt a raktárkész kerekekre.
//
// 📦 SZÜKSÉGES CSOMAG:
//      npx expo install expo-camera
//
// Props:
//   visible     {boolean}  – modal látható-e
//   onDetected  {function} – callback(barcodeValue: string)
//   onClose     {function} – bezárás / mégse
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// --- OPCIÓ B KEZDETE ---

const FINDER_SIZE = 240;
const CORNER_SIZE = 28;

const BarcodeScannerModal = ({ visible, onDetected, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [lastValue, setLastValue]       = useState(null);
  const scanLineAnim                    = useRef(new Animated.Value(0)).current;

  // Animált szkenner vonal végigfut a keresőablakon
  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    setLastValue(null);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLastValue(data);
  };

  // Engedély véglegesen megtagadva → útmutató nézet
  if (permission && !permission.granted && !permission.canAskAgain) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={60} color="#ff5169" />
          <Text style={styles.permissionTitle}>Kamera hozzáférés megtagadva</Text>
          <Text style={styles.permissionText}>
            Engedélyezd a kamera hozzáférést a telefon Beállítások → Adatvédelem menüjében.
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Bezárás</Text>
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
        {/* ÉLŐKÉP */}
        {permission?.granted && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr", "ean13", "ean8",
                "code128", "code39", "code93",
                "datamatrix", "pdf417", "aztec",
              ],
            }}
          />
        )}

        {/* SÖTÉT OVERLAY – keresőkereten kívüli terület */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />

            {/* KERESŐ ABLAK */}
            <View style={styles.finder}>
              {/* Sarokjelek */}
              {[
                { top: 0,    left: 0,   borderTopWidth: 3,    borderLeftWidth: 3  },
                { top: 0,    right: 0,  borderTopWidth: 3,    borderRightWidth: 3 },
                { bottom: 0, left: 0,   borderBottomWidth: 3, borderLeftWidth: 3  },
                { bottom: 0, right: 0,  borderBottomWidth: 3, borderRightWidth: 3 },
              ].map((s, i) => (
                <View key={i} style={[styles.corner, s]} />
              ))}

              {/* Mozgó szkenner vonal */}
              {!scanned && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, FINDER_SIZE - 2],
                        }),
                      }],
                    },
                  ]}
                />
              )}

              {/* Zöld flash sikeres olvasáskor */}
              {scanned && (
                <View style={styles.scannedFlash}>
                  <MaterialCommunityIcons name="check-circle" size={52} color="#36e2c6" />
                </View>
              )}
            </View>

            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* FEJLÉC */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtnWrap} onPress={onClose}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vonalkód olvasás</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ALAP UTASÍTÁS VAGY EREDMÉNY */}
        <View style={styles.bottomBox}>
          {!scanned ? (
            <Text style={styles.instructionText}>
              Tartsd a vonalkódot / QR-kódot a keretbe
            </Text>
          ) : (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Beolvasott kód:</Text>
              <Text style={styles.resultValue} numberOfLines={2}>{lastValue}</Text>

              <View style={styles.resultButtons}>
                <TouchableOpacity
                  style={styles.rescanBtn}
                  onPress={() => { setScanned(false); setLastValue(null); }}
                >
                  <MaterialCommunityIcons name="refresh" size={18} color="#39e6ff" />
                  <Text style={styles.rescanText}>Újra</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => onDetected(lastValue)}
                >
                  <MaterialCommunityIcons name="check" size={18} color="white" />
                  <Text style={styles.confirmText}>Használom ezt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- OPCIÓ B VÉGE ---

export default BarcodeScannerModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#050c18",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  permissionText: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: 8,
    backgroundColor: "#0A2342",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  overlayTop:    { flex: 1,           backgroundColor: "rgba(0,0,0,0.62)" },
  overlayMiddle: { flexDirection: "row", height: FINDER_SIZE },
  overlaySide:   { flex: 1,           backgroundColor: "rgba(0,0,0,0.62)" },
  overlayBottom: { flex: 2,           backgroundColor: "rgba(0,0,0,0.62)" },
  // Kereső ablak
  finder: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#39e6ff",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#39e6ff",
    shadowColor: "#39e6ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  scannedFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(54,226,198,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
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
  headerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  // Alap / eredmény doboz
  bottomBox: {
    position: "absolute",
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  instructionText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  resultCard: {
    backgroundColor: "rgba(7,15,32,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(57,230,255,0.3)",
    padding: 16,
    width: "100%",
    gap: 10,
  },
  resultLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultValue: {
    color: "#39e6ff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  resultButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  rescanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#39e6ff",
  },
  rescanText: { color: "#39e6ff", fontWeight: "700", fontSize: 14 },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0A2342",
  },
  confirmText: { color: "white", fontWeight: "700", fontSize: 14 },
});
