/**
 * AcwrZonePill — Bodysense Mobile
 *
 * Compact ACWR zone indicator with:
 *   • Coloured border + semi-transparent fill per zone
 *   • Zone-coloured shadow / elevation glow (iOS neon + Android elevation)
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
import { BS, ZONE_GLOW } from "../../lib/theme";

interface AcwrZonePillProps {
  ratio:   number;
  zone:    AcwrRiskZone;
  /** Show "Sin ACWR" placeholder instead of real data. */
  noData?: boolean;
}

export default function AcwrZonePill({ ratio, zone, noData }: AcwrZonePillProps) {
  const zoneInfo  = ACWR_ZONES[zone];
  const color     = zoneInfo.color;
  const isPulsing = zone === "high" || zone === "very_high";
  const glow      = ZONE_GLOW[zone];

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
          toValue:         0.12,
          duration:        700,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue:         1,
          duration:        700,
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
      <View style={styles.pillEmpty}>
        <View style={[styles.dot, { backgroundColor: "#334155" }]} />
        <Text style={styles.textEmpty}>Sin ACWR</Text>
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
          // ── iOS neon glow ──
          shadowColor:     color,
          shadowOpacity:   glow.opacity,
          shadowRadius:    glow.radius,
          shadowOffset:    { width: 0, height: 0 },
          // ── Android elevation ──
          elevation:       glow.elevation,
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
      <Text style={[styles.separator, { color: color + "60" }]}>·</Text>

      {/* Zone label */}
      <Text style={[styles.zoneLabel, { color }]}>
        {zoneInfo.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection:     "row",
    alignItems:        "center",
    alignSelf:         "flex-start",
    gap:               5,
    borderWidth:       1,
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },

  // Empty state — no glow, muted colours
  pillEmpty: {
    flexDirection:     "row",
    alignItems:        "center",
    alignSelf:         "flex-start",
    gap:               5,
    borderWidth:       1,
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderColor:       "rgba(51,65,85,0.5)",
    backgroundColor:   "rgba(51,65,85,0.10)",
  },

  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },

  // Numeric ACWR value — tabular nums, tight tracking
  value: {
    fontSize:      12,
    fontWeight:    "800",
    letterSpacing: 0.5,
  },

  separator: {
    fontSize:   11,
    fontWeight: "600",
  },

  // Zone name (e.g. "Óptimo", "Alto")
  zoneLabel: {
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 0.4,
  },

  // Empty state text
  textEmpty: {
    color:         "#334155",
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: BS.labelTracking,
  },
});
