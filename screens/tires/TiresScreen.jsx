// =============================================================
// TiresScreen – UNIVERZÁLIS gumiabroncs-diagnosztika (Controller)
//
// Mindig EZ a képernyő töltődik be a kerékadatokhoz. A route.params
// `vehicleType` alapján dinamikusan a megfelelő blueprintet rajzolja:
//   • truck            → <TruckBlueprint />   (6 kerék)
//   • trailer / trailer_*→ <TrailerBlueprint /> (4 kerék)
//
// A kerék-állapotok pozíció-kulcs szerint tárolódnak; a kattintás,
// a TireStatsModal mentés és a raktárból felszerelés mindkét típusnál
// azonos módon működik.
// =============================================================

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getStockTires,
  getTiresByVehicle,
  mountStockTire,
  updateTireData,
} from "../../api/tireAPI";
import EmptyTireActionModal from "../../components/EmptyTireActionModal";
import TireStatsModal from "../../components/TireStatsModal";
import WarehouseTireModal from "../../components/WarehouseTireModal";
import { DEFAULT_TIRE_LIMITS } from "../../lib/tireLimits";
import { ACC, getTireDisplayStatus, STATUS } from "./components/blueprintCore";
import TrailerBlueprint, {
  getTrailerDemo,
  getTrailerLayout,
  trailerTypeLabel,
} from "./components/TrailerBlueprint";
import TruckBlueprint, {
  DEMO_TIRES as TRUCK_DEMO,
  LABELS as TRUCK_LABELS,
  TYPE_LABEL as TRUCK_TYPE,
} from "./components/TruckBlueprint";

// Kamion-konfiguráció statikus; a pótkocsié az axleCount alapján generálódik.
const TRUCK_CONFIG = {
  Blueprint: TruckBlueprint, labels: TRUCK_LABELS, demo: TRUCK_DEMO, typeLabel: TRUCK_TYPE,
};

const TiresScreen = ({ navigation, route }) => {
  const plateNumber = route?.params?.plateNumber || "ABC-123";
  const vehicleId = route?.params?.vehicleId ?? null;
  const vehicleType = route?.params?.vehicleType ?? "default";
  const model = route?.params?.model || null;
  const readOnly = route?.params?.readOnly ?? false; // sofőr: csak olvasás
  const isTrailer = (vehicleType ?? "").startsWith("trailer");
  const axleCount = isTrailer ? Math.min(3, Math.max(1, Number(route?.params?.axleCount) || 2)) : null;

  // Pótkocsinál a config (kerékpozíciók, feliratok, demo) a tengelyszámból
  // generálódik; useMemo tartja stabilan (a loadTires függ tőle).
  const config = useMemo(() => {
    if (isTrailer) {
      const layout = getTrailerLayout(axleCount);
      return {
        Blueprint: TrailerBlueprint,
        labels: layout.labels,
        demo: getTrailerDemo(axleCount),
        typeLabel: trailerTypeLabel(axleCount),
      };
    }
    return TRUCK_CONFIG;
  }, [isTrailer, axleCount]);
  const Blueprint = config.Blueprint;

  const [tires, setTires] = useState(config.demo);
  const [selectedId, setSelectedId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [colorMode, setColorMode] = useState("pressure"); // "pressure" | "tread"

  // Üres pozíció választómenü + raktári lista
  const [emptyPos, setEmptyPos] = useState(null);
  const [choiceVisible, setChoiceVisible] = useState(false);
  const [warehouseVisible, setWarehouseVisible] = useState(false);
  const [stockTires, setStockTires] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  const selectedTire = selectedId ? tires[selectedId] : null;

  const loadTires = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const rows = await getTiresByVehicle(vehicleId);
      setTires(() => {
        // Friss alap: a típushoz tartozó MINDEN pozíció üres (null)
        const next = Object.keys(config.labels).reduce((acc, pos) => {
          acc[pos] = null;
          return acc;
        }, {});
        rows.forEach((row) => {
          const pos = row.position;
          if (pos in next) {
            const bar = row.current_bar != null ? parseFloat(row.current_bar) : null;
            const mm  = row.current_mm  != null ? parseFloat(row.current_mm)  : null;
            next[pos] = {
              id: pos,
              position: config.labels[pos] ?? pos,
              pressure: bar,
              tread: mm,
              status: row.operational_status ?? "good",
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Tire load error:", err.message);
    }
  }, [vehicleId, config]);

  useEffect(() => { loadTires(); }, [loadTires]);

  // Visszatéréskor (pl. AddTire képernyőről) frissítünk
  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", loadTires);
    return unsub;
  }, [navigation, loadTires]);

  const counts = Object.values(tires).reduce(
    (acc, t) => {
      const ds = getTireDisplayStatus(t, colorMode, vehicleType);
      if (ds === "good") acc.ok++;
      else if (ds === "warning") acc.warn++;
      else if (ds === "critical") acc.crit++;
      return acc;
    },
    { ok: 0, warn: 0, crit: 0 }
  );

  const handleTirePress = (tireId) => {
    if (!tires[tireId]) {
      if (readOnly) return; // sofőr nem vehet fel kereket
      setEmptyPos(tireId);
      setChoiceVisible(true);
      return;
    }
    setSelectedId(tireId);
    setModalVisible(true);
  };

  const handleAddNew = () => {
    const pos = emptyPos;
    setChoiceVisible(false);
    setEmptyPos(null);
    navigation?.navigate("AddTire", { vehicleId, plateNumber, position: pos, vehicleType, axleCount });
  };

  const handleChooseFromStock = async () => {
    setChoiceVisible(false);
    setWarehouseVisible(true);
    setStockLoading(true);
    try {
      setStockTires(await getStockTires());
    } catch (err) {
      console.error("Stock load error:", err.message);
      setStockTires([]);
    } finally {
      setStockLoading(false);
    }
  };

  const handleMountStock = async (stockTire) => {
    const pos = emptyPos;
    if (!pos) return;
    try {
      if (vehicleId) await mountStockTire(stockTire.id, vehicleId, pos);
      const bar = stockTire.current_bar != null ? parseFloat(stockTire.current_bar) : null;
      const mm  = stockTire.current_mm  != null ? parseFloat(stockTire.current_mm)  : null;
      setTires((prev) => ({
        ...prev,
        [pos]: {
          id: pos,
          position: config.labels[pos] ?? pos,
          pressure: bar,
          tread: mm,
          status: stockTire.operational_status ?? "good",
        },
      }));
    } catch (err) {
      console.error("Mount stock error:", err.message);
    } finally {
      setWarehouseVisible(false);
      setEmptyPos(null);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedId(null);
  };

  const handleSave = async ({ id, pressure, tread, status }) => {
    setIsSaving(true);
    try {
      if (vehicleId) {
        await updateTireData(vehicleId, id, { pressure, tread, status });
      }
      const bar = parseFloat(pressure) || null;
      const mm  = parseFloat(tread)    || null;
      setTires((prev) => ({
        ...prev,
        [id]: { ...prev[id], pressure: bar, tread: mm, status },
      }));
      setModalVisible(false);
      setSelectedId(null);
    } catch (err) {
      console.error("Tire save error:", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* FEJLÉC – dinamikus modell + típus */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{model || plateNumber}</Text>
          <Text style={styles.headerSubtitle}>{config.typeLabel} · Diagnosztika</Text>
        </View>
        <View style={styles.counts}>
          {[
            { key: "ok",   color: STATUS.good.color,     count: counts.ok },
            { key: "warn", color: STATUS.warning.color,  count: counts.warn },
            { key: "crit", color: STATUS.critical.color, count: counts.crit },
          ].map(({ key, color, count }) => (
            <View key={key} style={styles.countItem}>
              <View style={[styles.pip, { backgroundColor: color }]} />
              <Text style={styles.countText}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* MÓD VÁLTÓ – nyomás (bar) vs. profilmélység (mm) */}
      <View style={styles.modeBar}>
        {[
          { key: "pressure", label: "bar", icon: "gauge" },
          { key: "tread",    label: "mm",  icon: "ruler" },
        ].map(({ key, label, icon }) => {
          const isActive = colorMode === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.modeChip, isActive && styles.modeChipActive]}
              onPress={() => setColorMode(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.modeDot, isActive && styles.modeDotActive]} />
              <MaterialCommunityIcons name={icon} size={16} color={isActive ? ACC : "rgba(255,255,255,0.35)"} />
              <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* DINAMIKUS BLUEPRINT (truck vagy trailer) */}
      <View style={styles.blueprintContainer}>
        <Blueprint
          tires={tires}
          colorMode={colorMode}
          vehicleType={vehicleType}
          axleCount={axleCount}
          selectedId={selectedId}
          onTirePress={handleTirePress}
        />
      </View>

      <TireStatsModal
        visible={modalVisible}
        onClose={handleModalClose}
        tire={selectedTire}
        onSave={handleSave}
        isSaving={isSaving}
        limits={DEFAULT_TIRE_LIMITS}
        readOnly={readOnly}
      />

      <EmptyTireActionModal
        visible={choiceVisible}
        position={emptyPos}
        positionLabel={emptyPos ? config.labels[emptyPos] : null}
        onChooseFromStock={handleChooseFromStock}
        onAddNew={handleAddNew}
        onClose={() => { setChoiceVisible(false); setEmptyPos(null); }}
      />

      <WarehouseTireModal
        visible={warehouseVisible}
        positionLabel={emptyPos ? config.labels[emptyPos] : null}
        tires={stockTires}
        loading={stockLoading}
        onSelect={handleMountStock}
        onClose={() => { setWarehouseVisible(false); setEmptyPos(null); }}
      />

      {/* GUMI HOZZÁADÁSA – FAB; sofőr (read-only) nem látja */}
      {!readOnly && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation?.navigate("AddTire", { vehicleId, plateNumber, vehicleType, axleCount })}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* JELMAGYARÁZAT */}
      <View style={styles.legendContainer}>
        {[
          { color: STATUS.good.color,     label: "Megfelelő" },
          { color: STATUS.warning.color,  label: "Korrigálandó" },
          { color: STATUS.critical.color, label: "Kritikus" },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070f20" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  backBtn: { marginRight: 10 },
  headerTextContainer: { flex: 1, justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "700", letterSpacing: 0.5 },
  headerSubtitle: {
    color: "#475569",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 3,
  },
  counts: { flexDirection: "row", gap: 12, alignItems: "center" },
  countItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  pip: { width: 7, height: 7, borderRadius: 3.5 },
  countText: { fontFamily: "monospace", fontSize: 12, color: "#9fc2e8" },
  modeBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 10,
    backgroundColor: "#070f20",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  modeChipActive: { borderColor: ACC, backgroundColor: "rgba(57,230,255,0.08)" },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  modeDotActive: {
    backgroundColor: ACC,
    shadowColor: ACC,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  modeLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 },
  modeLabelActive: { color: ACC },
  blueprintContainer: { flex: 1 },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: "#040a14",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.02)",
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0A2342",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default TiresScreen;
