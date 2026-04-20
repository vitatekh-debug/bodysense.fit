import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";
import { ACWR_ZONES, SPORT_LABELS } from "@vitatekh/shared";
import type { AthleteWithAcwr, Sport } from "@vitatekh/shared";

const SPORT_FILTERS: { value: Sport | "all"; label: string }[] = [
  { value: "all",        label: "Todos" },
  { value: "basketball", label: "Baloncesto" },
  { value: "football",   label: "Fútbol" },
  { value: "volleyball", label: "Voleibol" },
];

export default function AthletesTab() {
  const { profile } = useAuthStore();
  const [athletes, setAthletes] = useState<AthleteWithAcwr[]>([]);
  const [filtered, setFiltered] = useState<AthleteWithAcwr[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<Sport | "all">("all");

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, sportFilter, athletes]);

  async function loadAthletes() {
    if (!profile) return;

    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("professional_id", profile.id);

    if (!teams || teams.length === 0) {
      setLoading(false);
      return;
    }

    const teamIds = teams.map((t) => t.id);

    const { data: members } = await supabase
      .from("team_members")
      .select(`
        athlete_id,
        profiles!team_members_athlete_id_fkey (
          id, full_name, email, sport, role, avatar_url, created_at, updated_at
        )
      `)
      .in("team_id", teamIds);

    if (!members) { setLoading(false); return; }

    const athleteIds = members.map((m) => m.athlete_id);

    const { data: acwrData } = await supabase
      .from("acwr_snapshots")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false });

    const latestAcwr = new Map<string, NonNullable<typeof acwrData>[number]>();
    (acwrData ?? []).forEach((s) => {
      if (!latestAcwr.has(s.athlete_id)) latestAcwr.set(s.athlete_id, s);
    });

    const result: AthleteWithAcwr[] = members.map((m) => ({
      ...(m.profiles as any),
      latest_acwr: latestAcwr.get(m.athlete_id),
    }));

    setAthletes(result);
    setLoading(false);
  }

  function applyFilters() {
    let data = [...athletes];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((a) => a.full_name.toLowerCase().includes(q));
    }
    if (sportFilter !== "all") {
      data = data.filter((a) => a.sport === sportFilter);
    }
    setFiltered(data);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atletas</Text>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Buscar atleta..."
        placeholderTextColor="#475569"
        value={search}
        onChangeText={setSearch}
      />

      {/* Sport filter chips */}
      <View style={styles.filterRow}>
        {SPORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, sportFilter === f.value && styles.filterChipActive]}
            onPress={() => setSportFilter(f.value)}
          >
            <Text style={[styles.filterText, sportFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{filtered.length} atleta{filtered.length !== 1 ? "s" : ""}</Text>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {athletes.length === 0 ? "No tienes atletas aún." : "Sin resultados."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const zone = item.latest_acwr ? ACWR_ZONES[item.latest_acwr.risk_zone] : null;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(professional)/athlete/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.sport}>
                    {item.sport ? SPORT_LABELS[item.sport] : "Sin deporte"}
                  </Text>
                </View>
                <View style={styles.right}>
                  {zone ? (
                    <>
                      <Text style={[styles.acwr, { color: zone.color }]}>
                        {item.latest_acwr?.acwr_ratio.toFixed(2)}
                      </Text>
                      <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                    </>
                  ) : (
                    <Text style={styles.noAcwr}>—</Text>
                  )}
                </View>
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
  centered:  { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800", marginBottom: 14 },
  search: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    color: "#F1F5F9",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  filterRow:       { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterChip:      { backgroundColor: "#1E293B", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#312E81", borderColor: "#6366F1" },
  filterText:      { color: "#64748B", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#818CF8" },
  count:           { color: "#475569", fontSize: 12, marginBottom: 10 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#312E81",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#818CF8", fontWeight: "700", fontSize: 14 },
  name:  { color: "#F1F5F9", fontWeight: "600", fontSize: 15 },
  sport: { color: "#64748B", fontSize: 12, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  acwr:  { fontWeight: "800", fontSize: 16 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  noAcwr: { color: "#475569" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 },
  emptyText: { color: "#475569", fontSize: 14 },
});
