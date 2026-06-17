// =============================================================
// blueprintCore – megosztott gumiabroncs-blueprint építőelemek
//
// Mind a TruckBlueprint, mind a TrailerBlueprint ezeket használja,
// így a kerekek megjelenése, a LED-pontok, a 3-szintű színezés
// (tireConfig.js) és a touch-kezelés mindenhol AZONOS.
// =============================================================

import { useEffect, useRef } from "react";
import { Animated, TouchableOpacity } from "react-native";
import { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { getTireStatusFromValue } from "../../../constants/tireConfig";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// --- Stílus-konstansok (high-tech blueprint) ---
export const LW = 1.25;
export const LINE = "rgba(228,241,255,0.86)";
export const SOFT = "rgba(150,190,234,0.30)";
export const ACC = "#39e6ff";
export const TW = 24;   // kerék szélesség
export const TH = 58;   // kerék magasság

// Közös viewBox méret minden blueprintnél
export const SVG_W = 450;
export const SVG_H = 800;

// Kapszula méret
export const CAP_W = 46;
export const CAP_H = 18;

export const STATUS = {
  good:     { color: "#36e2c6", bg: "rgba(54,226,198,0.12)",  label: "OK" },
  warning:  { color: "#ffb648", bg: "rgba(255,182,72,0.12)",  label: "FIGYELEM" },
  critical: { color: "#ff5169", bg: "rgba(255,81,105,0.15)",  label: "KRITIKUS" },
  unknown:  { color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.04)", label: "ISMERETLEN" },
  empty:    { color: "#334155", bg: "rgba(51,65,85,0.18)",    label: "ÜRES" },
};

// Megjelenítési státusz az aktív mód + járműtípus szerint (tireConfig.js).
// Üres pozíció (nincs gumi) → "empty" (szürke).
export const getTireDisplayStatus = (tire, mode, vehicleType = "default") => {
  if (!tire) return "empty";
  if (mode === "tread") return getTireStatusFromValue(tire.tread, "mm", vehicleType);
  return getTireStatusFromValue(tire.pressure, "bar", vehicleType);
};

// Kapszula-szöveg az aktív mód szerint
export const getCapsuleText = (tire, mode) => {
  if (!tire) return "+";
  if (mode === "tread") return tire.tread != null ? `${tire.tread} mm` : "– mm";
  return tire.pressure != null ? `${tire.pressure} bar` : "– bar";
};

// SVG viewBox koordináták → képernyő-koordináta (xMidYMid meet)
export const getSvgToScreenRect = (layout, svgX, svgY, svgW, svgH) => {
  if (!layout?.width || !layout?.height) return null;
  const scale = Math.min(layout.width / SVG_W, layout.height / SVG_H);
  const offsetX = (layout.width - SVG_W * scale) / 2;
  const offsetY = (layout.height - SVG_H * scale) / 2;
  return {
    position: "absolute",
    left:   offsetX + svgX * scale,
    top:    offsetY + svgY * scale,
    width:  svgW * scale,
    height: svgH * scale,
  };
};

// ── Egy kerék (SVG, vizuális) – a touch-ot a TireTouchOverlays végzi ──
export const TireSVG = ({ pos, isSelected, displayStatus }) => {
  const { x, y } = pos;
  const s = STATUS[displayStatus] ?? STATUS.unknown;
  const isCritical = displayStatus === "critical";
  const isEmpty = displayStatus === "empty";

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
  }, [isCritical, pulseAnim]);

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
        strokeDasharray={isEmpty ? "4 4" : undefined}
        fill={isEmpty ? "rgba(51,65,85,0.10)" : isSelected ? "rgba(57,230,255,0.08)" : "rgba(57,230,255,0.03)"}
      />
      <Line x1={x + 7}      y1={y + 4} x2={x + 7}      y2={y + TH - 4} stroke={s.color} strokeWidth={1.2} opacity={isEmpty ? 0.3 : 0.5} />
      <Line x1={x + TW - 7} y1={y + 4} x2={x + TW - 7} y2={y + TH - 4} stroke={s.color} strokeWidth={1.2} opacity={isEmpty ? 0.3 : 0.5} />
      {isEmpty ? (
        <SvgText x={cx} y={cy + 5} fontSize={16} fontWeight="700" fill={s.color} textAnchor="middle">+</SvgText>
      ) : (
        <Circle cx={cx} cy={cy} r={3} fill={s.color} />
      )}
      {isSelected && (
        <Rect x={x - 4} y={y - 4} width={TW + 8} height={TH + 8} rx={7} fill="none" stroke={ACC} strokeWidth={1} opacity={0.6} />
      )}
    </G>
  );
};

// ── Egy adatkapszula (SVG) – bar / mm érték a státusz színével ──
export const TireCapsule = ({ cp, tire, colorMode, vehicleType }) => {
  const ds = getTireDisplayStatus(tire, colorMode, vehicleType);
  const s = STATUS[ds] ?? STATUS.unknown;
  return (
    <G>
      <Rect
        x={cp.x} y={cp.y} width={CAP_W} height={CAP_H} rx={CAP_H / 2}
        fill={s.bg} stroke={s.color} strokeWidth={1}
        strokeDasharray={ds === "empty" ? "3 3" : undefined}
      />
      <SvgText
        x={cp.x + CAP_W / 2}
        y={cp.y + CAP_H / 2 + 3.5}
        fontSize={10}
        fontWeight="700"
        fill={s.color}
        textAnchor="middle"
      >
        {getCapsuleText(tire, colorMode)}
      </SvgText>
    </G>
  );
};

// ── Abszolút pozicionált, kattintható touch-területek a kerekekhez ──
export const TireTouchOverlays = ({ positions, layout, onPress }) => {
  return Object.entries(positions).map(([id, pos]) => {
    const rect = getSvgToScreenRect(layout, pos.x - 8, pos.y - 8, TW + 16, TH + 16);
    if (!rect) return null;
    return (
      <TouchableOpacity
        key={id}
        style={rect}
        onPress={() => onPress(id)}
        activeOpacity={0.4}
      />
    );
  });
};
