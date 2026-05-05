/**
 * DotGrid — Bodysense Mobile
 *
 * Absolute-positioned SVG dot-pattern overlay (react-native-svg Pattern).
 * Place inside a `position: "relative"` + `overflow: "hidden"` container.
 * Always pointer-events-none so it never blocks touches.
 *
 * @example
 * <View style={{ position: "relative", overflow: "hidden", height: 180 }}>
 *   <DotGrid />
 *   <Text style={{ zIndex: 1 }}>Content on top</Text>
 * </View>
 */

import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Circle, Rect } from "react-native-svg";

interface DotGridProps {
  /** Dot fill color. Defaults to indigo at very low opacity. */
  color?: string;
  /** Grid pitch in px (distance between dot centres). Defaults to 24. */
  spacing?: number;
  /** Dot radius in px. Defaults to 1. */
  radius?: number;
}

const DotGrid = memo(function DotGrid({
  color   = "rgba(129,140,248,0.07)",
  spacing = 24,
  radius  = 1,
}: DotGridProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="bs-dot-grid"
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <Circle
              cx={radius}
              cy={radius}
              r={radius}
              fill={color}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bs-dot-grid)" />
      </Svg>
    </View>
  );
});

export default DotGrid;
