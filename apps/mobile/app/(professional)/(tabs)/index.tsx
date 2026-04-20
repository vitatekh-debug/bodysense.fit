import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";
import { ACWR_ZONES, SPORT_LABELS, formatDate } from "@vitatekh/shared";
import type { AthleteWithAcwr } from "@vitatekh/shared";

export default function ProfessionalDashboard() {
  const { profile } = useAuthStore();
  const [athletes, setAthletes] = useState<AthleteWithAcwr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthletes();
  }, []);

  async function loadAthletes() {
    if (!profile) return;

    // Get teams managed by this professional
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("professional_id", profile.id);

    if (!teams || teams.length === 0) {
      setLoading(false);
      return;
    }

    const teamIds = teams.map((t) => t.id);

    // Get team members with their latest ACWR
    const { data: members } = await supabase
      .from("team_members")
      .select(`
        athlete_id,
        profiles!team_members_athlete_id_fkey (
          id, full_name, email, sport, avatar_url
        )
      `)
      .in("team_id", teamIds);

    if (!members) {
      setLoading(false);
      return;
    }

    const athleteIds = members.map((m) => m.athlete_id);

    // Get latest ACWR for each athlete
    const { data: acwrData } = await supabase
      .from("acwr_snapshots")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false });

    const latestAcwr = new Map<string, typeof acwrData extends (infer T)[] | null ? T : never>();
    acwrData?.forEach((snapshot) => {
      if (!latestAcwr.has(snapshot.athlete_id)) {
        latestAcwr.set(snapshot.athlete_id, snapshot);
      }
    });

    const result: AthleteWithAcwr[] = members.map((m) => ({
      ...(m.profiles as any),
      role: "athlete" as const,
      created_at: "",
      updated_at: "",
      latest_acwr: latestAcwr.get(m.athlete_id),
    }));

    setAthletes(result);
    setLoading(false);
  }

  const riskCount = athletes.filter(
    (a) => a.latest_acwr?.risk_zone === "high" || a.latest_acwr?.risk_zone === "very_high"
  ).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Buenos días,</Text>
        <Text style={styles.name}>{profile?.full_name ?? "Profesional"}</Text>
      </View>

      {/* Alert banner */}
      {riskCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ {riskCount} atleta{riskCount > 1 ? "s" : ""} en zona de riesgo
          </Text>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{athletes.length}</Text>
          <Text style={styles.statLabel}>Atletas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#22C55E" }]}>
            {athletes.filter((a) => a.latest_acwr?.risk_zone === "optimal").length}
          </Text>
          <Text style={styles.statLabel}>Óptimos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#EF4444" }]}>{riskCount}</Text>
          <Text style={styles.statLabel}>En Riesgo</Text>
        </View>
      </View>

      {/* Athletes list */}
      <Text style={styles.sectionTitle}>Estado del Equipo</Text>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
      ) : athletes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No tienes atletas aún.</Text>
          <Text style={styles.emptySubtext}>Crea un equipo y agrega deportistas.</Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const zone = item.latest_acwr?.risk_zone ?? null;
            const zoneInfo = zone ? ACWR_ZONES[zone] : null;
            return (
              <TouchableOpacity
                style={styles.athleteCard}
                onPress={() => router.push(`/(professional)/athlete/${item.id}`)}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.athleteName}>{item.full_name}</Text>
                  <Text style={styles.athleteSport}>
                    {item.sport ? SPORT_LABELS[item.sport] : "Sin deporte"}
                  </Text>
                </View>
                {zoneInfo && (
                  <View style={[styles.riskBadge, { backgroundColor: zoneInfo.color + "33" }]}>
                    <Text style={[styles.riskText, { color: zoneInfo.color }]}>
                      {item.latest_acwr?.acwr_ratio.toFixed(2) ?? "—"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", paddingTop: 56, paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  greeting: { color: "#64748B", fontSize: 14 },
  name: { color: "#F1F5F9", fontSize: 24, fontWeight: "800" },
  alertBanner: {
    backgroundColor: "#7F1D1D33",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertText: { color: "#FCA5A5", fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "800", color: "#F1F5F9" },
  statLabel: { color: "#64748B", fontSize: 12, marginTop: 4 },
  sectionTitle: { color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 12, letterSpacing: 1 },
  athleteCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#312E81",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#818CF8", fontWeight: "700", fontSize: 14 },
  athleteName: { color: "#F1F5F9", fontWeight: "600", fontSize: 15 },
  athleteSport: { color: "#64748B", fontSize: 12, marginTop: 2 },
  riskBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  riskText: { fontWeight: "800", fontSize: 14 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 },
  emptyText: { color: "#F1F5F9", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#64748B", fontSize: 13, marginTop: 6 },
});
