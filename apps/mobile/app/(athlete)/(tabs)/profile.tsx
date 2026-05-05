/**
 * Perfil del Atleta — Bodysense Industrial Dark
 *
 * Redesigned to match the home screen's design system:
 *   • #080808 background + dot-grid texture
 *   • Avatar with neon-indigo ring (consistent with AthleteHeader)
 *   • Uppercase 10px labels
 *   • #818CF8 role badge, #EF4444 sign-out border
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuthStore } from "../../../store/auth.store";
import { SPORT_LABELS } from "@vitatekh/shared";
import type { Sport } from "@vitatekh/shared";
import { BS } from "../../../lib/theme";
import DotGrid from "../../../components/ui/DotGrid";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ProfileAvatar({ name }: { name: string }) {
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

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AthleteProfileTab() {
  const { profile, signOut } = useAuthStore();

  function handleSignOut() {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  }

  const sport = profile?.sport
    ? (SPORT_LABELS[profile.sport as Sport] ?? profile.sport)
    : null;

  return (
    <View style={styles.screen}>
      {/* ── Hero section with dot-grid ── */}
      <View style={styles.hero}>
        <DotGrid />
        <View style={styles.heroContent}>
          {profile && <ProfileAvatar name={profile.full_name} />}
          <Text style={styles.name}>{profile?.full_name ?? "Atleta"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>DEPORTISTA</Text>
          </View>
        </View>
      </View>

      {/* ── Info card ── */}
      <View style={styles.infoCard}>
        {sport && <InfoRow label="DEPORTE" value={sport} />}
        {profile?.email && <InfoRow label="CORREO" value={profile.email} />}
      </View>

      {/* ── Sign-out ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          accessibilityLabel="Cerrar sesión"
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: BS.void,
  },

  // Hero
  hero: {
    backgroundColor: BS.void,
    overflow:        "hidden",
    paddingTop:      72,
    paddingBottom:   32,
    alignItems:      "center",
  },
  heroContent: { alignItems: "center", gap: 12, zIndex: 1 },

  avatarRing: {
    width:          88,
    height:         88,
    borderRadius:   44,
    borderWidth:    2,
    borderColor:    BS.borderBrand,
    alignItems:     "center",
    justifyContent: "center",
    shadowColor:    BS.brandLight,
    shadowOpacity:  0.3,
    shadowRadius:   10,
    shadowOffset:   { width: 0, height: 0 },
  },
  avatarInner: {
    width:           76,
    height:          76,
    borderRadius:    38,
    backgroundColor: "rgba(129,140,248,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: {
    color:      BS.brandLight,
    fontSize:   26,
    fontWeight: "800",
  },

  name: {
    color:         BS.textPrimary,
    fontSize:      22,
    fontWeight:    "800",
    letterSpacing: 0.2,
  },
  roleBadge: {
    backgroundColor: "rgba(129,140,248,0.12)",
    borderWidth:     1,
    borderColor:     BS.borderBrand,
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical:   5,
  },
  roleBadgeText: {
    color:         BS.brandLight,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: BS.labelTracking,
  },

  // Info card
  infoCard: {
    marginHorizontal: BS.pagePad,
    marginTop:        8,
    backgroundColor:  BS.surface,
    borderRadius:     BS.cardRadius,
    borderWidth:      1,
    borderColor:      BS.border,
    overflow:         "hidden",
  },
  infoRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: BS.borderFaint,
  },
  infoLabel: {
    color:         BS.textMuted,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: BS.labelTracking,
    textTransform: "uppercase",
  },
  infoValue: {
    color:      BS.textPrimary,
    fontSize:   14,
    fontWeight: "600",
  },

  // Footer
  footer: {
    paddingHorizontal: BS.pagePad,
    paddingTop:        24,
  },
  signOutBtn: {
    borderWidth:     1,
    borderColor:     "rgba(239,68,68,0.5)",
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      "center",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  signOutText: {
    color:      BS.error,
    fontWeight: "700",
    fontSize:   15,
  },
});
