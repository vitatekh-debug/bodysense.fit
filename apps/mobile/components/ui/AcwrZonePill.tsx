/**
 * AcwrZonePill — Bodysense Mobile
 *
 * Compact ACWR zone indicator with:
 *   • Coloured border + semi-transparent background per zone
 *   • Animated pulsing dot for high / very_high risk (useNativeDriver: true)
 *   • Graceful "Sin ACWR" empty state
 *
 * @example
 * <AcwrZonePill ratio={1.42} zone="high" />
 * <AcwrZonePill ratio={0} zone="low" noData />
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { AcwrRiskZone } from "@vitatekh/shared";

interface AcwrZonePillProps {
  ratio:  number;
  zone:   AcwrRiskZone;
  /** Show "Sin ACWR" placeholder instead of real data. */
  noData?: boolean;
}

export default function AcwrZonePill({ ratio, zone, noData }: AcwrZonePillProps) {
  const zoneInfo   = ACWR_ZONES[zone];
  const color      = zoneInfo.color;
  const isPulsing  = zone === "high" || zone === "very_high";

  // ── Pulse animation (opacity 1 → 0.15 → 1) ──────────────────────────────
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPulsing) {
      dotOpacity.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue:         0.15,
          duration:        750,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue:         1,
          duration:        750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isPulsing, dotOpacity]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (noData) {
    return (
      <View
        style={[
          styles.pill,
          {
            borderColor:     "rgba(100,116,139,0.25)",
            backgroundColor: "rgba(100,116,139,0.07)",
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: "#475569" }]} />
        <Text style={[styles.text, { color: "#475569" }]}>Sin ACWR</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          borderColor:     color + "40",
          backgroundColor: color + "14",
        },
      ]}
    >
      {/* Pulsing dot */}
      <Animated.View
        style={[styles.dot, { backgroundColor: color, opacity: dotOpacity }]}
      />

      {/* Ratio value */}
      <Text style={[styles.value, { color }]}>
        {ratio.toFixed(2)}
      </Text>

      {/* Separator */}
      <Text style={[styles.separator, { color: color + "70" }]}>·</Text>

      {/* Zone label */}
      <Text style={[styles.text, { color }]}>
        {zoneInfo.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection:   "row",
    alignItems:      "center",
    alignSelf:       "flex-start",
    gap:             5,
    borderWidth:     1,
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  value: {
    fontSize:     12,
    fontWeight:   "700",
    letterSpacing: 0.3,
  },
  separator: {
    fontSize:   11,
    fontWeight: "600",
  },
  text: {
    fontSize:     11,
    fontWeight:   "600",
    letterSpacing: 0.2,
  },
});
