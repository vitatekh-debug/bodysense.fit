/**
 * Skeleton — Animated loading placeholders for Vitatekh Mobile
 *
 * Usage:
 *   import { Skeleton, SkeletonCheckin } from "@/components/Skeleton";
 *
 *   // Generic block:
 *   <Skeleton width={200} height={20} />
 *
 *   // Check-in page skeleton:
 *   <SkeletonCheckin />
 *
 *   // My Load page skeleton:
 *   <SkeletonMyLoad />
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

// ─── Base Skeleton Block ──────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.65],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#334155",
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Check-in Screen Skeleton ─────────────────────────────────────────────────

export function SkeletonCheckin() {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Skeleton width="60%" height={28} borderRadius={10} />
      <Skeleton width="40%" height={14} borderRadius={6} style={{ marginTop: 4 }} />

      {/* 4 metric cards */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="50%" height={13} borderRadius={6} />
          <Skeleton width="30%" height={22} borderRadius={8} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 10 }} />
        </View>
      ))}

      {/* Submit button */}
      <Skeleton width="100%" height={54} borderRadius={14} />
    </View>
  );
}

// ─── My Load Screen Skeleton ──────────────────────────────────────────────────

export function SkeletonMyLoad() {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Skeleton width="40%" height={28} borderRadius={10} />

      {/* ACWR big card */}
      <View style={styles.bigCard}>
        <Skeleton width="35%" height={12} borderRadius={6} />
        <Skeleton width="45%" height={56} borderRadius={12} style={{ marginTop: 12, alignSelf: "center" }} />
        <Skeleton width="50%" height={28} borderRadius={20} style={{ marginTop: 8, alignSelf: "center" }} />
      </View>

      {/* 2 metric cards */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.card, { flex: 1 }]}>
            <Skeleton width="70%" height={11} borderRadius={5} />
            <Skeleton width="50%" height={24} borderRadius={8} style={{ marginTop: 8 }} />
            <Skeleton width="30%" height={11} borderRadius={5} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* History rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.historyRow}>
          <Skeleton width="30%" height={13} borderRadius={5} />
          <Skeleton width="15%" height={15} borderRadius={5} />
          <Skeleton width="25%" height={12} borderRadius={5} />
        </View>
      ))}
    </View>
  );
}

// ─── Prevention Tab Skeleton ──────────────────────────────────────────────────

export function SkeletonPrevention() {
  return (
    <View style={styles.container}>
      <Skeleton width="70%" height={26} borderRadius={10} />

      {/* 2 session cards */}
      {[1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="80%" height={15} borderRadius={6} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Skeleton width={60} height={22} borderRadius={20} />
            <Skeleton width={80} height={22} borderRadius={20} />
          </View>
          <Skeleton width="40%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.avatarSkeleton}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width="60%" height={13} borderRadius={5} />
          <Skeleton width="40%" height={11} borderRadius={5} />
        </View>
      </View>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Skeleton key={i} width={48} height={22} borderRadius={10} style={{ alignSelf: "center" }} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20, paddingTop: 56, paddingBottom: 40 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
  },
  bigCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 28,
  },
  historyRow: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  avatarSkeleton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
