// =============================================================
// TruckBlueprint – MAN TGX (4×2, ikerkerekes hátsó tengely) felülnézeti váz
//
// Tisztán SVG-blueprint a high-tech stílusban. A kerekek, kapszulák,
// LED-pontok és a touch-kezelés a blueprintCore megosztott elemeiből.
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
export const POSITIONS = {
  FL:  { x: 82,  y: 221 },
  FR:  { x: 344, y: 221 },
  RL1: { x: 56,  y: 599 },
  RL2: { x: 84,  y: 599 },
  RR1: { x: 342, y: 599 },
  RR2: { x: 370, y: 599 },
};

const CAPSULE_POSITIONS = {
  FL:  { x: 30,  y: 241 },
  FR:  { x: 374, y: 241 },
  RL1: { x: 4,   y: 607 },
  RL2: { x: 4,   y: 629 },
  RR1: { x: 400, y: 607 },
  RR2: { x: 400, y: 629 },
};

export const LABELS = {
  FL:  "Bal Első",
  FR:  "Jobb Első",
  RL1: "Bal Hátsó 1",
  RL2: "Bal Hátsó 2",
  RR1: "Jobb Hátsó 1",
  RR2: "Jobb Hátsó 2",
};

// Demo-adat, ha nincs valódi jármű (vehicleId)
export const DEMO_TIRES = {
  FL:  { id: "FL",  position: LABELS.FL,  status: "good",     pressure: 9.2, tread: 14 },
  FR:  { id: "FR",  position: LABELS.FR,  status: "good",     pressure: 8.9, tread: 13 },
  RL1: { id: "RL1", position: LABELS.RL1, status: "warning",  pressure: 7.8, tread: 6 },
  RR1: { id: "RR1", position: LABELS.RR1, status: "critical", pressure: 6.4, tread: 3 },
  RL2: { id: "RL2", position: LABELS.RL2, status: "good",     pressure: 8.7, tread: 11 },
  RR2: null, // szándékosan üres – szürke kerék
};

export const TYPE_LABEL = "Vontató · 4×2";

const TruckBlueprint = ({ tires, colorMode, vehicleType, selectedId, onTirePress }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
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

export default TruckBlueprint;
