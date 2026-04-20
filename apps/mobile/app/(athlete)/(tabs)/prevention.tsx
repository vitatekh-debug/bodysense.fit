"use client";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";

interface Exercise {
  id: string;
  name: string;
  category: string;
  instructions: string | null;
}

interface SessionExercise {
  id: string;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  order_index: number;
  notes: string | null;
  exercise: Exercise;
}

interface PreventionSession {
  id: string;
  title: string;
  description: string | null;
  date: string;
  type: "group" | "individual";
  sport: string | null;
  completed_at: string | null;
  exercises: SessionExercise[];
}

export default function AthletePreventionTab() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<PreventionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadSessions();
  }, [profile]);

  async function loadSessions() {
    if (!profile) return;
    setLoading(true);

    // 1. Get prevention_athletes rows for this athlete (with session data)
    const { data: paRows } = await supabase
      .from("prevention_athletes")
      .select(`
        id,
        completed_at,
        prevention_sessions!prevention_athletes_session_id_fkey (
          id, title, description, date, type, sport
        )
      `)
      .eq("athlete_id", profile.id)
      .order("id", { ascending: false });

    if (!paRows || paRows.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const sessionIds = (paRows as any[]).map((r: any) => r.prevention_sessions?.id).filter(Boolean);

    // 2. Load exercises for all sessions at once
    const { data: exRows } = await supabase
      .from("session_exercises")
      .select(`
        id, session_id, sets, reps, duration_sec, order_index, notes,
        exercises!session_exercises_exercise_id_fkey (id, name, category, instructions)
      `)
      .in("session_id", sessionIds)
      .order("order_index", { ascending: true });

    // Group exercises by session_id
    const exBySession: Record<string, SessionExercise[]> = {};
    ((exRows ?? []) as any[]).forEach((ex: any) => {
      const sid = ex.session_id;
      if (!exBySession[sid]) exBySession[sid] = [];
      exBySession[sid]!.push({
        id:           ex.id,
        exercise_id:  ex.exercises?.id,
        sets:         ex.sets,
        reps:         ex.reps,
        duration_sec: ex.duration_sec,
        order_index:  ex.order_index,
        notes:        ex.notes,
        exercise:     ex.exercises,
      });
    });

    // 3. Combine
    const built: PreventionSession[] = (paRows as any[])
      .filter((r: any) => r.prevention_sessions)
      .map((r: any) => {
        const s = r.prevention_sessions;
        return {
          id:           s.id,
          title:        s.title,
          description:  s.description,
          date:         s.date,
          type:         s.type,
          sport:        s.sport,
          completed_at: r.completed_at,
          exercises:    exBySession[s.id] ?? [],
        };
      });

    // Sort: pending first, then by date desc
    built.sort((a, b) => {
      if (!a.completed_at && b.completed_at) return -1;
      if (a.completed_at && !b.completed_at) return 1;
      return b.date.localeCompare(a.date);
    });

    setSessions(built);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleMarkComplete(session: PreventionSession) {
    if (session.completed_at) return;

    Alert.alert(
      "Marcar como completada",
      `¿Completaste la sesión "${session.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, completada",
          onPress: async () => {
            setCompleting(session.id);
            const completedAt = new Date().toISOString();

            const { error } = await supabase
              .from("prevention_athletes")
              .update({ completed_at: completedAt })
              .eq("athlete_id", profile!.id)
              .eq("session_id", session.id);

            setCompleting(null);

            if (error) {
              Alert.alert("Error", "No se pudo registrar la sesión.");
              return;
            }

            setSessions((prev) =>
              prev
                .map((s) =>
                  s.id === session.id ? { ...s, completed_at: completedAt } : s
                )
                .sort((a, b) => {
                  if (!a.completed_at && b.completed_at) return -1;
                  if (a.completed_at && !b.completed_at) return 1;
                  return b.date.localeCompare(a.date);
                })
            );
          },
        },
      ]
    );
  }

  function formatExerciseDetail(ex: SessionExercise) {
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets} series`);
    if (ex.reps) parts.push(`${ex.reps} reps`);
    if (ex.duration_sec) parts.push(`${ex.duration_sec}s`);
    return parts.join(" · ") || "Ver instrucciones";
  }

  const pending   = sessions.filter((s) => !s.completed_at);
  const completed = sessions.filter((s) => !!s.completed_at);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Mis Sesiones Preventivas</Text>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 60 }} />
      ) : sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>Sin sesiones asignadas</Text>
          <Text style={styles.emptyText}>
            Tu fisioterapeuta o entrenador te asignará sesiones preventivas aquí.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Pending sessions ─────────────────────────────── */}
          {pending.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>PENDIENTES</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{pending.length}</Text>
                </View>
              </View>

              {pending.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  expanded={expanded.has(s.id)}
                  completing={completing === s.id}
                  onToggle={() => toggleExpand(s.id)}
                  onComplete={() => handleMarkComplete(s)}
                  formatDetail={formatExerciseDetail}
                />
              ))}
            </>
          )}

          {/* ── Completed sessions ───────────────────────────── */}
          {completed.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: pending.length > 0 ? 24 : 0 }]}>
                <Text style={styles.sectionLabel}>COMPLETADAS</Text>
              </View>

              {completed.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  expanded={expanded.has(s.id)}
                  completing={false}
                  onToggle={() => toggleExpand(s.id)}
                  onComplete={() => {}}
                  formatDetail={formatExerciseDetail}
                />
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Session Card Sub-component ──────────────────────────────────────────────

function SessionCard({
  session,
  expanded,
  completing,
  onToggle,
  onComplete,
  formatDetail,
}: {
  session: PreventionSession;
  expanded: boolean;
  completing: boolean;
  onToggle: () => void;
  onComplete: () => void;
  formatDetail: (ex: SessionExercise) => string;
}) {
  const isCompleted = !!session.completed_at;

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      {/* Card header */}
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            {isCompleted && <Text style={styles.completedIcon}>✅ </Text>}
            <Text style={[styles.cardTitle, isCompleted && styles.cardTitleDone]}>
              {session.title}
            </Text>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.cardDate}>{session.date}</Text>
            {session.sport && (
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{session.sport}</Text>
              </View>
            )}
            <View style={[styles.typeBadge, session.type === "group" ? styles.typeBadgeGroup : styles.typeBadgeIndiv]}>
              <Text style={styles.typeBadgeText}>
                {session.type === "group" ? "Grupal" : "Individual"}
              </Text>
            </View>
          </View>

          {session.exercises.length > 0 && (
            <Text style={styles.exerciseCount}>
              {session.exercises.length} ejercicio{session.exercises.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.cardBody}>
          {session.description && (
            <Text style={styles.cardDescription}>{session.description}</Text>
          )}

          {session.exercises.length > 0 ? (
            <>
              <Text style={styles.exercisesLabel}>Ejercicios:</Text>
              {session.exercises.map((ex, idx) => (
                <View key={ex.id} style={styles.exerciseRow}>
                  <View style={styles.exerciseIndex}>
                    <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{ex.exercise?.name ?? "Ejercicio"}</Text>
                    <Text style={styles.exerciseDetail}>{formatDetail(ex)}</Text>
                    {ex.exercise?.instructions && (
                      <Text style={styles.exerciseInstr}>{ex.exercise.instructions}</Text>
                    )}
                    {ex.notes && (
                      <Text style={styles.exerciseNotes}>📝 {ex.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.noExercises}>Sin ejercicios registrados.</Text>
          )}

          {/* Complete button */}
          {!isCompleted && (
            <TouchableOpacity
              style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
              onPress={onComplete}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.completeBtnText}>✓ Marcar como Completada</Text>
              )}
            </TouchableOpacity>
          )}

          {isCompleted && session.completed_at && (
            <View style={styles.completedInfo}>
              <Text style={styles.completedInfoText}>
                Completada el {new Date(session.completed_at).toLocaleDateString("es-CO")}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800", marginBottom: 4 },

  // Empty state
  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "700" },
  emptyText:  { color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionLabel:  { color: "#64748B", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  countBadge:    { backgroundColor: "#6366F1", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countText:     { color: "#fff", fontSize: 11, fontWeight: "800" },

  // Card
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  cardCompleted: { borderColor: "#166534", backgroundColor: "#0F2117" },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  cardTitleRow:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  completedIcon: { fontSize: 15 },
  cardTitle:     { color: "#F1F5F9", fontSize: 15, fontWeight: "700", flex: 1, lineHeight: 20 },
  cardTitleDone: { color: "#22C55E" },

  cardMeta:    { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  cardDate:    { color: "#64748B", fontSize: 12 },

  sportBadge:     { backgroundColor: "#064E3B", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  sportBadgeText: { color: "#6EE7B7", fontSize: 11, fontWeight: "700" },
  typeBadge:      { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeGroup: { backgroundColor: "#312E81" },
  typeBadgeIndiv: { backgroundColor: "#1E3A5F" },
  typeBadgeText:  { color: "#C7D2FE", fontSize: 11, fontWeight: "700" },

  exerciseCount: { color: "#475569", fontSize: 12 },
  chevron:       { color: "#475569", fontSize: 12, paddingTop: 4 },

  // Expanded body
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#0F172A",
    padding: 16,
    gap: 12,
  },
  cardDescription: { color: "#94A3B8", fontSize: 13, lineHeight: 18 },

  exercisesLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },

  exerciseRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  exerciseIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#312E81",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  exerciseIndexText: { color: "#818CF8", fontSize: 12, fontWeight: "800" },
  exerciseName:   { color: "#F1F5F9", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  exerciseDetail: { color: "#6366F1", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  exerciseInstr:  { color: "#94A3B8", fontSize: 12, lineHeight: 17 },
  exerciseNotes:  { color: "#64748B", fontSize: 12, marginTop: 4, fontStyle: "italic" },

  noExercises: { color: "#475569", fontSize: 13, textAlign: "center", paddingVertical: 8 },

  completeBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  completedInfo: {
    backgroundColor: "#052E16",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  completedInfoText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
});
