// =============================================================
// TrailerBlueprint – DINAMIKUS tengelyszámú pótkocsi (1 / 2 / 3 tengely)
//
// A tengelyek számát az `axleCount` prop adja:
//   1 → 1 hátsó tengely  (2 kerék:  T1_L, T1_R)
//   2 → tandem           (4 kerék:  T1_L..T2_R)
//   3 → tridem           (6 kerék:  T1_L..T3_R)
//
// Vonórúd + plató váz fixen elöl; a tengelyek/kerekek/kapszulák a
// layoutból generálódnak. A kerekek, LED-pontok, 3-szintű színezés
// (tireConfig.js) és a touch a blueprintCore megosztott elemeiből.
//
// Props: { tires, colorMode, vehicleType, selectedId, onTirePress, axleCount }
// =============================================================

import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import {
  ACC, getTireDisplayStatus, LINE, LW, SOFT,
  TireCapsule, TireSVG, TireTouchOverlays,
} from "./blueprintCore";

const TH = 58; // kerékmagasság (a blueprintCore-ral egyező – Y-középre igazítás)

// Tengely Y-pozíciók tengelyszám szerint (viewBox 0 0 450 800)
const AXLE_YS = {
  1: [600],
  2: [560, 648],
  3: [524, 600, 676],
};

const clampAxles = (n) => Math.min(3, Math.max(1, Number(n) || 2));

// Egy adott tengelyszámhoz tartozó teljes elrendezés: kerék-pozíciók,
// kapszula-pozíciók, feliratok és a tengelyek Y-koordinátái.
// EZ a tengelyek/kerekek EGYETLEN igazságforrása (a controller is ezt hívja).
export const getTrailerLayout = (axleCount = 2) => {
  const n = clampAxles(axleCount);
  const ys = AXLE_YS[n];
  const positions = {};
  const capsules = {};
  const labels = {};
  ys.forEach((y, i) => {
    const idx = i + 1;
    const L = `T${idx}_L`;
    const R = `T${idx}_R`;
    positions[L] = { x: 84,  y: y - TH / 2 };
    positions[R] = { x: 342, y: y - TH / 2 };
    capsules[L]  = { x: 4,   y: y - 9 };
    capsules[R]  = { x: 400, y: y - 9 };
    labels[L]    = `Bal ${idx}. tengely`;
    labels[R]    = `Jobb ${idx}. tengely`;
  });
  return { n, axleYs: ys, positions, capsules, labels };
};

// Demo-adat (ha nincs valódi jármű) – az utolsó pozíció üres (szürke teszt)
export const getTrailerDemo = (axleCount = 2) => {
  const { labels } = getTrailerLayout(axleCount);
  const keys = Object.keys(labels);
  const sample = [
    { pressure: 9.0, tread: 13, status: "good" },
    { pressure: 7.3, tread: 7,  status: "warning" },
    { pressure: 8.8, tread: 12, status: "good" },
    { pressure: 6.4, tread: 4,  status: "critical" },
    { pressure: 9.1, tread: 14, status: "good" },
  ];
  const demo = {};
  keys.forEach((k, i) => {
    if (i === keys.length - 1) { demo[k] = null; return; } // utolsó üres
    demo[k] = { id: k, position: labels[k], ...sample[i % sample.length] };
  });
  return demo;
};

export const trailerTypeLabel = (axleCount = 2) =>
  `Pótkocsi · ${clampAxles(axleCount)} Tengely`;

const TrailerBlueprint = ({ tires, colorMode, vehicleType, selectedId, onTirePress, axleCount = 2 }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const { positions, capsules, axleYs } = getTrailerLayout(axleCount);

  // A plató alja a leghátsó tengelyhez igazodik (legalább 700-ig)
  const deckBottom = Math.max(700, axleYs[axleYs.length - 1] + 36);
  const deckH = deckBottom - 130;
  const railBottom = deckBottom - 12;

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
      <Svg viewBox="0 0 450 800" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>

        {/* ── VONÓRÚD (DRAWBAR) ── */}
        <Path d="M225 56 L188 130 L262 130 Z" stroke={LINE} strokeWidth={LW} fill="none" strokeLinejoin="round" />
        <Path d="M225 70 L200 124 L250 124 Z" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" strokeLinejoin="round" />
        <Circle cx="225" cy="70" r="7" stroke={ACC} strokeWidth={LW} fill="none" />
        <Circle cx="225" cy="70" r="2.5" fill={ACC} />

        {/* ── PLATÓ / PÓDIUM VÁZ ── */}
        <Rect x="150" y="130" width="150" height={deckH} rx="10" stroke={LINE} strokeWidth={LW * 1.4} fill="rgba(57,230,255,0.02)" />
        <Rect x="158" y="140" width="134" height={deckH - 20} rx="8" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" />

        {/* Hossztartók */}
        <Line x1="198" y1="150" x2="198" y2={railBottom} stroke={LINE} strokeWidth={LW * 1.4} strokeLinecap="round" />
        <Line x1="252" y1="150" x2="252" y2={railBottom} stroke={LINE} strokeWidth={LW * 1.4} strokeLinecap="round" />
        <Line x1="225" y1="80"  x2="225" y2={railBottom} stroke={ACC}  strokeWidth={LW * 0.6} strokeLinecap="round" />

        {/* Támasztóláb (landing gear) elöl */}
        <Rect x="168" y="236" width="12" height="22" rx="2" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Rect x="270" y="236" width="12" height="22" rx="2" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Line x1="180" y1="247" x2="270" y2="247" stroke={SOFT} strokeWidth={LW * 0.6} strokeDasharray="4 5" />
        <Circle cx="160" cy="140" r="2.5" fill={ACC} />
        <Circle cx="290" cy="140" r="2.5" fill={ACC} />

        {/* ── TENGELYEK (dinamikus) ── */}
        {axleYs.map((y) => (
          <G key={`axle-${y}`}>
            <Line x1="70" y1={y} x2="380" y2={y} stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
            <Circle cx="225" cy={y} r="9" stroke={SOFT} strokeWidth={LW} fill="none" />
            <Circle cx="225" cy={y} r="3" fill={ACC} />
          </G>
        ))}

        {/* Hátsó alfutásgátló */}
        <Line x1="160" y1={deckBottom + 10} x2="290" y2={deckBottom + 10} stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
        <Rect x="166" y={deckBottom} width="18" height="10" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
        <Rect x="266" y={deckBottom} width="18" height="10" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />

        {/* ── KEREKEK ── */}
        {Object.entries(positions).map(([id, pos]) => (
          <TireSVG
            key={id}
            pos={pos}
            isSelected={selectedId === id}
            displayStatus={getTireDisplayStatus(tires[id], colorMode, vehicleType)}
          />
        ))}

        {/* ── ADATKAPSZULÁK ── */}
        {Object.entries(capsules).map(([id, cp]) => (
          <TireCapsule key={`cap-${id}`} cp={cp} tire={tires[id]} colorMode={colorMode} vehicleType={vehicleType} />
        ))}
      </Svg>

      {/* TOUCH OVERLAY-EK */}
      <TireTouchOverlays positions={positions} layout={layout} onPress={onTirePress} />
    </View>
  );
};

export default TrailerBlueprint;
