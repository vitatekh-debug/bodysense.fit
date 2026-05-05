/**
 * AthleteHeader — Bodysense Mobile
 *
 * High-impact home-screen header. Adapts the web ProfileHeader to mobile:
 *   • #080808 Industrial Dark cover with SVG dot-grid overlay
 *   • 64 px avatar with neon-indigo ring + glow shadow (iOS)
 *   • Uppercase 10 px labels (DEPORTISTA · DEPORTE)
 *   • AcwrZonePill with animated pulse for high-risk zones
 *   • Date string + pending-sync badge
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SPORT_LABELS } from "@vitatekh/shared";
import type { AcwrRiskZone, Profile, Sport } from "@vitatekh/shared";
import { BS } from "../../lib/theme";
import DotGrid from "./DotGrid";
import AcwrZonePill from "./AcwrZonePill";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthleteHeaderProps {
  profile:      Profile | null;
  acwrRatio?:   number | null;
  acwrZone?:    AcwrRiskZone | null;
  pendingCount?: number;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AthleteAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={styles.avatarRing}>
      <View style={styles.avatarInner}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AthleteHeader({
  profile,
  acwrRatio,
  acwrZone,
  pendingCount = 0,
}: AthleteHeaderProps) {
  const sport = profile?.sport
    ? (SPORT_LABELS[profile.sport as Sport] ?? profile.sport)
    : null;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });

  const hasAcwr = acwrRatio != null && acwrZone != null;

  return (
    <View style={styles.container}>
      {/* Dot-grid texture — z-index below content */}
      <DotGrid />

      {/* Content */}
      <View style={styles.content}>
        {/* Top row: date + pending badge */}
        <View style={styles.topRow}>
          <Text style={styles.dateText}>{today}</Text>

          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>
                {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Identity row: avatar + name + labels + ACWR pill */}
        <View style={styles.identityRow}>
          {profile ? (
            <AthleteAvatar name={profile.full_name} />
          ) : (
            <View style={[styles.avatarRing, { opacity: 0.3 }]}>
              <View style={styles.avatarInner} />
            </View>
          )}

          <View style={styles.identityBlock}>
            {/* Name */}
            <Text style={styles.name} numberOfLines={1}>
              {profile?.full_name ?? "Atleta"}
            </Text>

            {/* DEPORTISTA · DEPORTE */}
            <View style={styles.metaRow}>
              <Text style={styles.label}>DEPORTISTA</Text>
              {sport && (
                <>
                  <Text style={styles.labelDot}>·</Text>
                  <Text style={styles.label}>{sport.toUpperCase()}</Text>
                </>
              )}
            </View>

            {/* ACWR Zone Pill */}
            {hasAcwr ? (
              <AcwrZonePill
                ratio={acwrRatio as number}
                zone={acwrZone as AcwrRiskZone}
              />
            ) : (
              <AcwrZonePill ratio={0} zone="low" noData />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: BS.void,
    overflow:        "hidden",
    paddingTop:      56,           // safe area top approximation
    paddingHorizontal: BS.pagePad,
    paddingBottom:   24,
  },

  content: { gap: 14, zIndex: 1 },

  // ── Top row ──
  topRow: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
  },
  dateText: {
    color:          BS.textMuted,
    fontSize:       12,
    fontWeight:     "600",
    letterSpacing:  0.4,
    textTransform:  "capitalize",
  },
  pendingBadge: {
    backgroundColor: "rgba(146,64,14,0.85)",
    borderRadius:    12,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  pendingText: {
    color:      "#FCD34D",
    fontSize:   11,
    fontWeight: "700",
  },

  // ── Identity row ──
  identityRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           14,
  },

  // Avatar ring with neon glow
  avatarRing: {
    width:        64,
    height:       64,
    borderRadius: 32,
    borderWidth:  2,
    borderColor:  BS.borderBrand,
    alignItems:   "center",
    justifyContent: "center",
    // Neon shadow (iOS only — Android ignores shadowColor on View)
    shadowColor:   BS.brandLight,
    shadowOpacity: 0.3,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 0 },
  },
  avatarInner: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: "rgba(129,140,248,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: {
    color:      BS.brandLight,
    fontSize:   20,
    fontWeight: "800",
  },

  // Name + labels
  identityBlock: { flex: 1, gap: 5 },
  name: {
    color:         BS.textPrimary,
    fontSize:      20,
    fontWeight:    "800",
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  label: {
    color:         BS.textMuted,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: BS.labelTracking,
  },
  labelDot: {
    color:      BS.textDisabled,
    fontSize:   10,
  },
});
