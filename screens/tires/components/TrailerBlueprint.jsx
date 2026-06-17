// =============================================================
// TrailerBlueprint – 2-tengelyes pótkocsi felülnézeti váz
//
// Hosszú plató/pódium váz + elöl háromszög vonórúd (drawbar),
// 2 tengely hátul-középen, tengelyenként bal/jobb kerékpozícióval
// (TL1, TR1, TL2, TR2). Stílus 100%-ban a kamion blueprintjével
// egyező; a kerekek/színezés/touch a blueprintCore-ból.
//
// Props: { tires, colorMode, vehicleType, selectedId, onTirePress }
// =============================================================

import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import {
  ACC, getTireDisplayStatus, LINE, LW, SOFT,
  TireCapsule, TireSVG, TireTouchOverlays,
} from "./blueprintCore";

// SVG-koordináták (viewBox 0 0 450 800)
// Tengely 1 (első pót-tengely) y=560, tengely 2 (hátsó) y=648.
export const POSITIONS = {
  TL1: { x: 84,  y: 531 }, // bal első pót (tengely 1)
  TR1: { x: 342, y: 531 }, // jobb első pót (tengely 1)
  TL2: { x: 84,  y: 619 }, // bal hátsó pót (tengely 2)
  TR2: { x: 342, y: 619 }, // jobb hátsó pót (tengely 2)
};

const CAPSULE_POSITIONS = {
  TL1: { x: 4,   y: 551 },
  TR1: { x: 400, y: 551 },
  TL2: { x: 4,   y: 639 },
  TR2: { x: 400, y: 639 },
};

export const LABELS = {
  TL1: "Bal Első Pót",
  TR1: "Jobb Első Pót",
  TL2: "Bal Hátsó Pót",
  TR2: "Jobb Hátsó Pót",
};

// Demo-adat, ha nincs valódi jármű (vehicleId)
export const DEMO_TIRES = {
  TL1: { id: "TL1", position: LABELS.TL1, status: "good",    pressure: 9.0, tread: 13 },
  TR1: { id: "TR1", position: LABELS.TR1, status: "warning", pressure: 7.3, tread: 7 },
  TL2: { id: "TL2", position: LABELS.TL2, status: "good",    pressure: 8.8, tread: 12 },
  TR2: null, // szándékosan üres – szürke kerék
};

export const TYPE_LABEL = "Pótkocsi · 2 tengely";

const TrailerBlueprint = ({ tires, colorMode, vehicleType, selectedId, onTirePress }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
      <Svg viewBox="0 0 450 800" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>

        {/* ── VONÓRÚD (DRAWBAR) – háromszög elöl ── */}
        <Path d="M225 56 L188 130 L262 130 Z" stroke={LINE} strokeWidth={LW} fill="none" strokeLinejoin="round" />
        <Path d="M225 70 L200 124 L250 124 Z" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" strokeLinejoin="round" />
        {/* vonószem (coupling eye) */}
        <Circle cx="225" cy="70" r="7" stroke={ACC} strokeWidth={LW} fill="none" />
        <Circle cx="225" cy="70" r="2.5" fill={ACC} />

        {/* ── PLATÓ / PÓDIUM VÁZ ── */}
        <Rect x="150" y="130" width="150" height="560" rx="10" stroke={LINE} strokeWidth={LW * 1.4} fill="rgba(57,230,255,0.02)" />
        <Rect x="158" y="140" width="134" height="540" rx="8" stroke={SOFT} strokeWidth={LW * 0.65} fill="none" />

        {/* Hossztartók (center rails) */}
        <Line x1="198" y1="150" x2="198" y2="678" stroke={LINE} strokeWidth={LW * 1.4} strokeLinecap="round" />
        <Line x1="252" y1="150" x2="252" y2="678" stroke={LINE} strokeWidth={LW * 1.4} strokeLinecap="round" />
        <Line x1="204" y1="156" x2="204" y2="672" stroke={SOFT} strokeWidth={LW * 0.6} strokeLinecap="round" />
        <Line x1="246" y1="156" x2="246" y2="672" stroke={SOFT} strokeWidth={LW * 0.6} strokeLinecap="round" />
        {/* ACC központi gerinc */}
        <Line x1="225" y1="80" x2="225" y2="678" stroke={ACC} strokeWidth={LW * 0.6} strokeLinecap="round" />

        {/* Kereszttartók (cross members) */}
        {[210, 300, 390, 470].map((y) => (
          <Line key={`cm-${y}`} x1="162" y1={y} x2="288" y2={y} stroke={SOFT} strokeWidth={LW * 0.6} />
        ))}

        {/* Támasztóláb (landing gear) elöl */}
        <Rect x="168" y="236" width="12" height="22" rx="2" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Rect x="270" y="236" width="12" height="22" rx="2" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Line x1="180" y1="247" x2="270" y2="247" stroke={SOFT} strokeWidth={LW * 0.6} strokeDasharray="4 5" />

        {/* Sarok-nittek (blueprint részlet) */}
        <Circle cx="160" cy="140" r="2.5" fill={ACC} />
        <Circle cx="290" cy="140" r="2.5" fill={ACC} />

        {/* ── 1. TENGELY (y=560) ── */}
        <Line x1="70" y1="560" x2="380" y2="560" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
        <Circle cx="225" cy="560" r="9" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Circle cx="225" cy="560" r="3" fill={ACC} />

        {/* ── 2. TENGELY (y=648) ── */}
        <Line x1="70" y1="648" x2="380" y2="648" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
        <Circle cx="225" cy="648" r="9" stroke={SOFT} strokeWidth={LW} fill="none" />
        <Circle cx="225" cy="648" r="3" fill={ACC} />

        {/* Hátsó alfutásgátló / lökhárító */}
        <Line x1="160" y1="700" x2="290" y2="700" stroke={LINE} strokeWidth={LW * 1.7} strokeLinecap="round" />
        <Line x1="160" y1="708" x2="290" y2="708" stroke={SOFT} strokeWidth={LW} strokeLinecap="round" />
        <Rect x="166" y="690" width="18" height="10" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />
        <Rect x="266" y="690" width="18" height="10" rx="2" stroke={ACC} strokeWidth={LW * 0.65} fill="none" />

        {/* KEREKEK */}
        {Object.entries(POSITIONS).map(([id, pos]) => (
          <TireSVG
            key={id}
            pos={pos}
            isSelected={selectedId === id}
            displayStatus={getTireDisplayStatus(tires[id], colorMode, vehicleType)}
          />
        ))}

        {/* ADATKAPSZULÁK */}
        {Object.entries(CAPSULE_POSITIONS).map(([id, cp]) => (
          <TireCapsule key={`cap-${id}`} cp={cp} tire={tires[id]} colorMode={colorMode} vehicleType={vehicleType} />
        ))}
      </Svg>

      {/* TOUCH OVERLAY-EK */}
      <TireTouchOverlays positions={POSITIONS} layout={layout} onPress={onTirePress} />
    </View>
  );
};

export default TrailerBlueprint;
