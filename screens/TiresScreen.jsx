import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { getTiresByVehicle, updateTireData } from "../api/tireAPI";
import TireStatsModal from "../components/TireStatsModal";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const LW = 1.25;
const LINE = "rgba(228,241,255,0.86)";
const SOFT = "rgba(150,190,234,0.30)";
const ACC = "#39e6ff";
const TW = 24;
const TH = 58;

const STATUS = {
  good:     { color: "#36e2c6", bg: "rgba(54,226,198,0.12)",  label: "OK" },
  warning:  { color: "#ffb648", bg: "rgba(255,182,72,0.12)",  label: "FIGYELEM" },
  critical: { color: "#ff5169", bg: "rgba(255,81,105,0.15)",  label: "KRITIKUS" },
  unknown:  { color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.04)", label: "ISMERETLEN" },
};

const INITIAL_TIRES = {
  FL:  { id: "FL",  position: "Bal Első",     status: null, pressure: null, tread: null },
  FR:  { id: "FR",  position: "Jobb Első",    status: null, pressure: null, tread: null },
  RL1: { id: "RL1", position: "Bal Hátsó 1",  status: null, pressure: null, tread: null },
  RR1: { id: "RR1", position: "Jobb Hátsó 1", status: null, pressure: null, tread: null },
  RL2: { id: "RL2", position: "Bal Hátsó 2",  status: null, pressure: null, tread: null },
  RR2: { id: "RR2", position: "Jobb Hátsó 2", status: null, pressure: null, tread: null },
};

// SVG-koordináták (viewBox="0 0 450 800")
// Első tengely y=250, hátsó tengely y=628
// Első kerekek (FL/FR) jobb/bal széle pontosan érinti az axle stub vonalakat (x=106 ill. x=344)
// Hátsó kettős kerekek: belső pár 4px-re a tengelytől, külső pár 4px-re a belsőktől
const TIRE_POSITIONS = {
  FL:  { x: 82,  y: 221 },
  FR:  { x: 344, y: 221 },
  RL1: { x: 56,  y: 599 },
  RL2: { x: 84,  y: 599 },
  RR1: { x: 342, y: 599 },
  RR2: { x: 370, y: 599 },
};

// Meghatározza a gumi megjelenítési státuszát az aktív mód alapján
const getTireDisplayStatus = (tire, mode) => {
  if (mode === "tread") {
    const mm = tire.tread;
    if (mm === null) return null;
    return mm >= 4 ? "good" : mm >= 2 ? "warning" : "critical";
  }
  // pressure mód – már elő van számítva
  return tire.status;
};

// Tisztán vizuális – touch kezelés az overlay TouchableOpacity-k végzik
const TireSVG = ({ pos, isSelected, displayStatus }) => {
  const { x, y } = pos;
  const s = STATUS[displayStatus] ?? STATUS.unknown;
  const isCritical = displayStatus === "critical";

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isCritical) { pulseAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCritical]);

  const cx = x + TW / 2;
  const cy = y + TH / 2;

  return (
    <G>
      {isCritical && (
        <AnimatedRect
          x={x} y={y} width={TW} height={TH} rx={4}
          fill={s.color}
          fillOpacity={pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.3] })}
          stroke="none"
        />
      )}
      <Rect
        x={x} y={y} width={TW} height={TH} rx={4}
        stroke={isSelected ? ACC : s.color}
        strokeWidth={isSelected ? 2 : 1.5}
        fill={isSelected ? "rgba(57,230,255,0.08)" : "rgba(57,230,255,0.03)"}
      />
      <Line x1={x + 7}      y1={y + 4} x2={x + 7}      y2={y + TH - 4} stroke={s.color} strokeWidth={1.2} opacity={0.5} />
      <Line x1={x + TW - 7} y1={y + 4} x2={x + TW - 7} y2={y + TH - 4} stroke={s.color} strokeWidth={1.2} opacity={0.5} />
      <Circle cx={cx} cy={cy} r={3} fill={s.color} />
      {isSelected && (
        <Rect x={x - 4} y={y - 4} width={TW + 8} height={TH + 8} rx={7} fill="none" stroke={ACC} strokeWidth={1} opacity={0.6} />
      )}
    </G>
  );
};

// Az SVG viewBox mérete
const SVG_W = 450;
const SVG_H = 800;

// SVG viewBox koordinátákat képernyő-koordinátává alakít (xMidYMid meet)
const getSvgToScreenRect = (layout, svgX, svgY, svgW, svgH) => {
  if (!layout.width || !layout.height) return null;
  const scale = Math.min(layout.width / SVG_W, layout.height / SVG_H);
  const offsetX = (layout.width  - SVG_W * scale) / 2;
  const offsetY = (layout.height - SVG_H * scale) / 2;
  return {
    position: "absolute",
    left:   offsetX + svgX * scale,
    top:    offsetY + svgY * scale,
    width:  svgW * scale,
    height: svgH * scale,
  };
};

const TiresScreen = ({ navigation, route }) => {
  const [tires, setTires] = useState(INITIAL_TIRES);
  const [selectedId, setSelectedId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const [colorMode, setColorMode] = useState("pressure"); // "pressure" | "tread"
  const plateNumber = route?.params?.plateNumber || "ABC-123";
  const vehicleId = route?.params?.vehicleId ?? null;

  const selectedTire = selectedId ? tires[selectedId] : null;

  useEffect(() => {
    if (!vehicleId) return;
    const load = async () => {
      try {
        const rows = await getTiresByVehicle(vehicleId);
        if (!rows.length) return;
        setTires((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            const pos = row.position;
            if (next[pos]) {
              const bar = row.current_bar != null ? parseFloat(row.current_bar) : null;
              const mm  = row.current_mm  != null ? parseFloat(row.current_mm)  : null;
              // Mentett státusz élvez elsőbbséget; ha nincs, nyomásból számítódik
              const savedStatus = row.operational_status ?? null;
              const derivedStatus = bar === null ? null
                : bar >= 8 ? "good"
                : bar >= 5 ? "warning"
                : "critical";
              next[pos] = {
                ...next[pos],
                pressure: bar,
                tread: mm,
                status: savedStatus ?? derivedStatus,
              };
            }
          });
          return next;
        });
      } catch (err) {
        console.error("Tire load error:", err.message);
      }
    };
    load();
  }, [vehicleId]);

  const counts = Object.values(tires).reduce(
    (acc, t) => {
      const ds = getTireDisplayStatus(t, colorMode);
      if (ds === "good") acc.ok++;
      else if (ds === "warning") acc.warn++;
      else if (ds === "critical") acc.crit++;
      return acc;
    },
    { ok: 0, warn: 0, crit: 0 }
  );

  const handleTirePress = (tireId) => {
    setSelectedId(tireId);
    setModalVisible(true);
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
        [id]: {
          ...prev[id],
          pressure: bar,
          tread: mm,
          status,
        },
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
      {/* FEJLÉC */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{plateNumber}</Text>
          <Text style={styles.headerSubtitle}>4×2 Tractor · Live</Text>
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

      {/* MÓD VÁLTÓ – nyomás (bar) vs. futófelület (mm) */}
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
              <MaterialCommunityIcons
                name={icon}
                size={16}
                color={isActive ? ACC : "rgba(255,255,255,0.35)"}
              />
              <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SVG KAMION BLUEPRINT + TOUCH OVERLAY-EK */}
      <View
        style={styles.blueprintContainer}
        onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}
      >
        <Svg viewBox="0 0 450 800" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>

          {/* ALVÁZ */}
          <Line x1="198" y1="300" x2="198" y2="734" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
          <Line x1="252" y1="300" x2="252" y2="734" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
          <Line x1="204" y1="306" x2="204" y2="728" stroke={SOFT} strokeWidth={LW * 0.65} strokeLinecap="round" />
          <Line x1="246" y1="306" x2="246" y2="728" stroke={SOFT} strokeWidth={LW * 0.65} strokeLinecap="round" />
          <Line x1="225" y1="316" x2="225" y2="626" stroke={ACC} strokeWidth={LW * 0.65} strokeLinecap="round" />
          <Circle cx="225" cy="372" r="4" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
          <Circle cx="225" cy="556" r="4" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
          <Circle cx="225" cy="464" r="5" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" />
          <Rect x="210" y="312" width="30" height="44" rx="4" stroke={SOFT} strokeWidth={LW} fill="none" />
          <Line x1="150" y1="730" x2="300" y2="730" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
          <Line x1="150" y1="738" x2="300" y2="738" stroke={SOFT} strokeWidth={LW} strokeLinecap="round" />
          <Rect x="152" y="716" width="20" height="11" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
          <Rect x="278" y="716" width="20" height="11" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
          <Rect x="212" y="718" width="26" height="9"  rx="2" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" />

          {/* FÜLKE */}
          <Path
            d="M138 112 Q138 70 180 70 L270 70 Q312 70 312 112 L312 288 Q312 300 300 300 L150 300 Q138 300 138 288 Z"
            stroke={LINE} strokeWidth={LW} fill="none" strokeLinejoin="round" strokeLinecap="round"
          />
          <Path
            d="M150 116 Q150 84 184 84 L266 84 Q300 84 300 116 L300 282 Q300 290 292 290 L158 290 Q150 290 150 282 Z"
            stroke={SOFT} strokeWidth={LW} fill="none" strokeLinejoin="round" strokeLinecap="round"
          />
          <Path d="M150 104 Q225 84 300 104" stroke={ACC} strokeWidth={LW * 0.65} fill="none" strokeLinecap="round" />
          <Rect x="206" y="74" width="38" height="7" rx="3" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
          <Line x1="150" y1="132" x2="300" y2="132" stroke={SOFT} strokeWidth={LW * 0.65} />
          <Line x1="158" y1="214" x2="292" y2="214" stroke={SOFT} strokeWidth={LW * 0.65} />
          <Line x1="158" y1="258" x2="292" y2="258" stroke={SOFT} strokeWidth={LW * 0.65} />
          <Line x1="225" y1="100" x2="225" y2="288" stroke={SOFT} strokeWidth={LW * 0.65} />
          <Rect x="202" y="150" width="46" height="40" rx="4" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" />
          <Circle cx="290" cy="120" r="3" fill={ACC} />

          {/* KOMPONENSEK */}
          <Rect x="150" y="358" width="44" height="116" rx="20" stroke={SOFT} strokeWidth={LW} fill="rgba(57,230,255,0.038)" />
          <Rect x="256" y="360" width="40" height="66"  rx="16" stroke={SOFT} strokeWidth={LW} fill="rgba(57,230,255,0.038)" />
          <Rect x="152" y="490" width="42" height="40"  rx="4"  stroke={SOFT} strokeWidth={LW} fill="none" />
          <Rect x="256" y="448" width="40" height="20"  rx="10" stroke={SOFT} strokeWidth={LW} fill="none" />
          <Rect x="256" y="476" width="40" height="20"  rx="10" stroke={SOFT} strokeWidth={LW} fill="none" />
          <Rect x="256" y="504" width="40" height="20"  rx="10" stroke={SOFT} strokeWidth={LW} fill="none" />

          {/* ELSŐ (KORMÁNYZOTT) TENGELY */}
          <Line x1="138" y1="250" x2="312" y2="250" stroke={SOFT} strokeWidth={LW} strokeDasharray="5 6" />
          <Line x1="106" y1="250" x2="138" y2="250" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
          <Line x1="312" y1="250" x2="344" y2="250" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />

          {/* NYEREG */}
          <Path
            d="M158 470 L292 470 Q300 470 300 480 L300 588 Q300 598 290 598 L243 598 L225 524 L207 598 L160 598 Q150 598 150 588 L150 480 Q150 470 158 470 Z"
            stroke={ACC} strokeWidth={LW} fill="rgba(57,230,255,0.038)" strokeLinejoin="round" strokeLinecap="round"
          />
          <Circle cx="225" cy="516" r="10"  stroke={ACC} strokeWidth={LW} fill="none" />
          <Circle cx="225" cy="516" r="3.5" fill={ACC} />

          {/* HÁTSÓ (HAJTOTT) TENGELY */}
          <Line x1="100" y1="628" x2="350" y2="628" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
          <Circle cx="225" cy="628" r="23" stroke={LINE} strokeWidth={LW * 1.7} fill="none" />
          <Circle cx="225" cy="628" r="11" stroke={SOFT} strokeWidth={LW} fill="none" />
          <Circle cx="225" cy="628" r="3"  fill={ACC} />

          {/* GUMIK – csak vizuális, onPress nincs */}
          {Object.entries(TIRE_POSITIONS).map(([id, pos]) => (
            <TireSVG
              key={id}
              pos={pos}
              isSelected={selectedId === id}
              displayStatus={getTireDisplayStatus(tires[id], colorMode)}
            />
          ))}
        </Svg>

        {/* TOUCH OVERLAY-EK – abszolút pozicionált, az SVG koordinátákból számítva */}
        {Object.entries(TIRE_POSITIONS).map(([id, pos]) => {
          const rect = getSvgToScreenRect(
            containerLayout,
            pos.x - 8, pos.y - 8,
            TW + 16,   TH + 16,
          );
          if (!rect) return null;
          return (
            <TouchableOpacity
              key={id}
              style={rect}
              onPress={() => handleTirePress(id)}
              activeOpacity={0.4}
            />
          );
        })}
      </View>

      <TireStatsModal
        visible={modalVisible}
        onClose={handleModalClose}
        tire={selectedTire}
        onSave={handleSave}
        isSaving={isSaving}
      />

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
  container: {
    flex: 1,
    backgroundColor: "#070f20",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  backBtn: {
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: "#475569",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 3,
  },
  counts: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  countText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#9fc2e8",
  },
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
  modeChipActive: {
    borderColor: ACC,
    backgroundColor: "rgba(57,230,255,0.08)",
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  modeDotActive: {
    backgroundColor: ACC,
    shadowColor: ACC,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
  },
  modeLabelActive: {
    color: ACC,
  },
  blueprintContainer: {
    flex: 1,
  },

  // --- JELMAGYARÁZAT ---
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: "#040a14",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.02)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default TiresScreen;
