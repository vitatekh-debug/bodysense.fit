/**
 * Pantalla: Mis Sesiones — atleta ve sus sesiones pendientes de RPE
 * Navega a /(athlete)/register-rpe?session_id=xxx&duration=yyy
 */
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";
import type { TrainingSession } from "@vitatekh/shared";

interface SessionWithRpe extends TrainingSession {
  has_rpe: boolean;
}

export default function MySessionsScreen() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<SessionWithRpe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    if (!profile) return;

    const { data: sessionsData } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("athlete_id", profile.id)
      .order("date", { ascending: false })
      .limit(20);

    if (!sessionsData) { setLoading(false); return; }

    const sessionIds = sessionsData.map((s) => s.id);
    const { data: rpeData } = await supabase
      .from("session_rpe")
      .select("session_id")
      .eq("athlete_id", profile.id)
      .in("session_id", sessionIds);

    const rpeSet = new Set((rpeData ?? []).map((r) => r.session_id));

    setSessions(
      sessionsData.map((s) => ({ ...s, has_rpe: rpeSet.has(s.id) }))
    );
    setLoading(false);
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
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Mis Sesiones</Text>
      <Text style={styles.subtitle}>
        Selecciona una sesión para registrar tu RPE
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No tienes sesiones registradas.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.has_rpe && styles.cardDone]}
              onPress={() => {
                if (item.has_rpe) return;
                router.push({
                  pathname: "/(athlete)/register-rpe",
                  params: { session_id: item.id, duration: String(item.duration_min) },
                });
              }}
              disabled={item.has_rpe}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDate}>{item.date}</Text>
                <Text style={styles.sessionType}>
                  {item.session_type} · {item.phase}
                </Text>
                <Text style={styles.sessionDuration}>{item.duration_min} min</Text>
              </View>
              {item.has_rpe ? (
                <View style={styles.rpeDone}>
                  <Text style={styles.rpeDoneText}>✅ RPE registrado</Text>
                </View>
              ) : (
                <View style={styles.rpePending}>
                  <Text style={styles.rpePendingText}>Registrar RPE →</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", paddingTop: 56, paddingHorizontal: 20 },
  centered:  { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  backBtn:   { marginBottom: 12 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  title:     { color: "#F1F5F9", fontSize: 24, fontWeight: "800" },
  subtitle:  { color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardDone: { opacity: 0.6 },
  sessionDate:     { color: "#94A3B8", fontSize: 12 },
  sessionType:     { color: "#F1F5F9", fontWeight: "600", fontSize: 14, textTransform: "capitalize", marginTop: 2 },
  sessionDuration: { color: "#64748B", fontSize: 12, marginTop: 2 },
  rpeDone: {
    backgroundColor: "#14532D33",
    borderRadius: 8,
    padding: 8,
  },
  rpeDoneText:    { color: "#4ADE80", fontSize: 12, fontWeight: "600" },
  rpePending: {
    backgroundColor: "#312E81",
    borderRadius: 8,
    padding: 8,
  },
  rpePendingText: { color: "#818CF8", fontSize: 12, fontWeight: "600" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 },
  emptyText: { color: "#475569", fontSize: 14 },
});
