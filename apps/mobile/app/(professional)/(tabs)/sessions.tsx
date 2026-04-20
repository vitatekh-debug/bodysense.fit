"use client";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";
import type { SessionType, SessionPhase, Sport, PreventionSessionType } from "@vitatekh/shared";

type Tab = "training" | "prevention";

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "physical",   label: "Físico" },
  { value: "technical",  label: "Técnico" },
  { value: "tactical",   label: "Táctico" },
  { value: "match",      label: "Partido" },
  { value: "recovery",   label: "Recuperación" },
  { value: "prevention", label: "Prevención" },
];

const PHASES: { value: SessionPhase; label: string }[] = [
  { value: "preseason",    label: "Pretemporada" },
  { value: "competition",  label: "Competición" },
  { value: "transition",   label: "Transición" },
];

const SPORTS: { value: Sport | ""; label: string }[] = [
  { value: "",           label: "Todos" },
  { value: "basketball", label: "Baloncesto" },
  { value: "football",   label: "Fútbol" },
  { value: "volleyball", label: "Voleibol" },
];

const PREV_TYPES: { value: PreventionSessionType; label: string }[] = [
  { value: "group",      label: "Grupal" },
  { value: "individual", label: "Individual" },
];

interface Athlete {
  id: string;
  full_name: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  sport: string | null;
  instructions: string | null;
}

interface SelectedExercise extends Exercise {
  sets: string;
  reps: string;
  duration_sec: string;
  notes: string;
}

export default function SessionsTab() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("training");

  // ── Teams (shared) ─────────────────────────────────────────────
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  // ── Training session state ─────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().split("T")[0] as string);
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] = useState<SessionType>("physical");
  const [phase, setPhase] = useState<SessionPhase>("competition");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Prevention session state ───────────────────────────────────
  const [prevTitle, setPrevTitle] = useState("");
  const [prevDesc, setPrevDesc] = useState("");
  const [prevDate, setPrevDate] = useState(new Date().toISOString().split("T")[0] as string);
  const [prevType, setPrevType] = useState<PreventionSessionType>("group");
  const [prevSport, setPrevSport] = useState<Sport | "">("");
  const [prevTeamId, setPrevTeamId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [athletesLoading, setAthletesLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [prevSubmitting, setPrevSubmitting] = useState(false);
  const [createdSessions, setCreatedSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Load teams once
  useEffect(() => {
    if (teamsLoaded || !profile) return;
    supabase
      .from("teams")
      .select("id, name")
      .eq("professional_id", profile.id)
      .then(({ data }) => {
        setTeams(data ?? []);
        if (data && data[0]) {
          setTeamId(data[0].id);
          setPrevTeamId(data[0].id);
        }
        setTeamsLoaded(true);
      });
  }, [profile, teamsLoaded]);

  // Load exercises catalog once
  useEffect(() => {
    if (exercises.length > 0) return;
    setExercisesLoading(true);
    supabase
      .from("exercises")
      .select("id, name, category, sport, instructions")
      .order("category", { ascending: true })
      .then(({ data }) => {
        setExercises(data ?? []);
        setExercisesLoading(false);
      });
  }, []);

  // Load athletes when prevTeamId changes
  useEffect(() => {
    if (!prevTeamId) return;
    setAthletesLoading(true);
    setSelectedAthletes(new Set());
    supabase
      .from("team_members")
      .select("athlete_id, profiles!team_members_athlete_id_fkey(id, full_name)")
      .eq("team_id", prevTeamId)
      .then(({ data }) => {
        const list = (data ?? []).map((m: any) => m.profiles).filter(Boolean);
        setAthletes(list);
        // Auto-select all for group
        if (prevType === "group") {
          setSelectedAthletes(new Set(list.map((a: Athlete) => a.id)));
        }
        setAthletesLoading(false);
      });
  }, [prevTeamId]);

  // Load existing prevention sessions
  useEffect(() => {
    if (activeTab !== "prevention" || !profile) return;
    loadPrevSessions();
  }, [activeTab, profile]);

  async function loadPrevSessions() {
    setSessionsLoading(true);
    const { data } = await supabase
      .from("prevention_sessions")
      .select("id, title, date, type, sport")
      .eq("created_by", profile!.id)
      .order("date", { ascending: false })
      .limit(15);
    setCreatedSessions(data ?? []);
    setSessionsLoading(false);
  }

  function toggleAthlete(id: string) {
    setSelectedAthletes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addExercise(ex: Exercise) {
    if (selectedExercises.find((e) => e.id === ex.id)) return;
    setSelectedExercises((prev) => [
      ...prev,
      { ...ex, sets: "3", reps: "10", duration_sec: "", notes: "" },
    ]);
    setShowExerciseModal(false);
  }

  function removeExercise(id: string) {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExerciseField(id: string, field: keyof SelectedExercise, value: string) {
    setSelectedExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  // ── Create training session ────────────────────────────────────
  async function handleCreateTrainingSession() {
    if (!profile) return;
    const durationNum = parseInt(duration);
    if (!durationNum || durationNum < 1) {
      Alert.alert("Error", "Ingresa una duración válida en minutos.");
      return;
    }
    setSubmitting(true);

    const { data: members } = await supabase
      .from("team_members")
      .select("athlete_id")
      .eq("team_id", teamId ?? "");

    const athleteIds = (members ?? []).map((m) => m.athlete_id);

    if (athleteIds.length === 0) {
      Alert.alert("Sin atletas", "El equipo seleccionado no tiene atletas.");
      setSubmitting(false);
      return;
    }

    const inserts = athleteIds.map((athleteId) => ({
      athlete_id: athleteId,
      team_id: teamId,
      date,
      duration_min: durationNum,
      session_type: sessionType,
      phase,
      description: description.trim() || null,
      created_by: profile.id,
    }));

    const { error } = await supabase.from("training_sessions").insert(inserts);
    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo crear la sesión: ${error.message}`);
      return;
    }

    Alert.alert(
      "✅ Sesión creada",
      `Se registró para ${athleteIds.length} atleta${athleteIds.length > 1 ? "s" : ""}.`
    );
    setDescription("");
  }

  // ── Create prevention session ──────────────────────────────────
  async function handleCreatePreventionSession() {
    if (!profile) return;
    if (!prevTitle.trim()) {
      Alert.alert("Error", "El título es obligatorio.");
      return;
    }
    if (selectedAthletes.size === 0) {
      Alert.alert("Error", "Selecciona al menos un atleta.");
      return;
    }

    setPrevSubmitting(true);

    // 1. Create prevention_session
    const { data: session, error: sessionErr } = await supabase
      .from("prevention_sessions")
      .insert({
        created_by:  profile.id,
        title:       prevTitle.trim(),
        description: prevDesc.trim() || null,
        date:        prevDate,
        type:        prevType,
        sport:       prevSport || null,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      Alert.alert("Error", sessionErr?.message ?? "No se pudo crear la sesión.");
      setPrevSubmitting(false);
      return;
    }

    // 2. Assign athletes
    const athleteInserts = Array.from(selectedAthletes).map((athleteId) => ({
      session_id: session.id,
      athlete_id: athleteId,
    }));
    await supabase.from("prevention_athletes").insert(athleteInserts);

    // 3. Add exercises if any
    if (selectedExercises.length > 0) {
      const exInserts = selectedExercises.map((ex, idx) => ({
        session_id:   session.id,
        exercise_id:  ex.id,
        sets:         ex.sets ? parseInt(ex.sets) : null,
        reps:         ex.reps ? parseInt(ex.reps) : null,
        duration_sec: ex.duration_sec ? parseInt(ex.duration_sec) : null,
        order_index:  idx,
        notes:        ex.notes.trim() || null,
      }));
      await supabase.from("session_exercises").insert(exInserts);
    }

    setPrevSubmitting(false);
    Alert.alert(
      "✅ Sesión preventiva creada",
      `"${prevTitle}" asignada a ${selectedAthletes.size} atleta${selectedAthletes.size > 1 ? "s" : ""}.`
    );

    // Reset form
    setPrevTitle("");
    setPrevDesc("");
    setPrevDate(new Date().toISOString().split("T")[0] as string);
    setPrevType("group");
    setPrevSport("");
    setSelectedExercises([]);
    setSelectedAthletes(new Set(athletes.map((a) => a.id)));
    setShowForm(false);
    loadPrevSessions();
  }

  // ── Filtered exercises for modal ───────────────────────────────
  const filteredExercises = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(exerciseFilter.toLowerCase()) ||
      ex.category.toLowerCase().includes(exerciseFilter.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Sesiones</Text>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(["training", "prevention"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
              {t === "training" ? "Entrenamiento" : "Prevención"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TRAINING TAB ─────────────────────────────────────── */}
      {activeTab === "training" ? (
        <View style={styles.form}>
          <Text style={styles.label}>Equipo</Text>
          {teams.length === 0 ? (
            <Text style={styles.hint}>No tienes equipos. Crea uno primero.</Text>
          ) : (
            <View style={styles.chipRow}>
              {teams.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, teamId === t.id && styles.chipActive]}
                  onPress={() => setTeamId(t.id)}
                >
                  <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Fecha</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#475569"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Duración (minutos)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholderTextColor="#475569"
          />

          <Text style={styles.label}>Tipo de Sesión</Text>
          <View style={styles.chipRow}>
            {SESSION_TYPES.map((st) => (
              <TouchableOpacity
                key={st.value}
                style={[styles.chip, sessionType === st.value && styles.chipActive]}
                onPress={() => setSessionType(st.value)}
              >
                <Text style={[styles.chipText, sessionType === st.value && styles.chipTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Fase de Temporada</Text>
          <View style={styles.chipRow}>
            {PHASES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, phase === p.value && styles.chipActive]}
                onPress={() => setPhase(p.value)}
              >
                <Text style={[styles.chipText, phase === p.value && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción de la sesión..."
            placeholderTextColor="#475569"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleCreateTrainingSession}
            disabled={submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? "Creando sesión..." : "Crear Sesión de Entrenamiento"}
            </Text>
          </TouchableOpacity>
        </View>

      ) : (
        /* ── PREVENTION TAB ──────────────────────────────────── */
        <View style={{ gap: 16 }}>

          {/* Existing sessions list */}
          {!showForm && (
            <>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => setShowForm(true)}
              >
                <Text style={styles.submitText}>+ Nueva Sesión Preventiva</Text>
              </TouchableOpacity>

              {sessionsLoading ? (
                <ActivityIndicator color="#6366F1" style={{ marginTop: 24 }} />
              ) : createdSessions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Aún no has creado sesiones preventivas.</Text>
                </View>
              ) : (
                createdSessions.map((s) => (
                  <View key={s.id} style={styles.sessionCard}>
                    <Text style={styles.sessionTitle}>{s.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Text style={styles.sessionMetaText}>{s.date}</Text>
                      <View style={[styles.badge, s.type === "group" ? styles.badgeGroup : styles.badgeIndiv]}>
                        <Text style={styles.badgeText}>{s.type === "group" ? "Grupal" : "Individual"}</Text>
                      </View>
                      {s.sport && (
                        <View style={styles.badgeSport}>
                          <Text style={styles.badgeText}>{s.sport}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* Create form */}
          {showForm && (
            <View style={styles.form}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Volver</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Nueva Sesión Preventiva</Text>

              {/* Title */}
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={prevTitle}
                onChangeText={setPrevTitle}
                placeholder="Ej: Prevención de rodilla semana 3"
                placeholderTextColor="#475569"
              />

              {/* Description */}
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={prevDesc}
                onChangeText={setPrevDesc}
                placeholder="Objetivo de la sesión..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
              />

              {/* Date */}
              <Text style={styles.label}>Fecha</Text>
              <TextInput
                style={styles.input}
                value={prevDate}
                onChangeText={setPrevDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#475569"
                keyboardType="numeric"
              />

              {/* Type */}
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipRow}>
                {PREV_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.value}
                    style={[styles.chip, prevType === pt.value && styles.chipActive]}
                    onPress={() => setPrevType(pt.value)}
                  >
                    <Text style={[styles.chipText, prevType === pt.value && styles.chipTextActive]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sport */}
              <Text style={styles.label}>Deporte</Text>
              <View style={styles.chipRow}>
                {SPORTS.map((sp) => (
                  <TouchableOpacity
                    key={sp.value}
                    style={[styles.chip, prevSport === sp.value && styles.chipActive]}
                    onPress={() => setPrevSport(sp.value)}
                  >
                    <Text style={[styles.chipText, prevSport === sp.value && styles.chipTextActive]}>
                      {sp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Team */}
              <Text style={styles.label}>Equipo</Text>
              <View style={styles.chipRow}>
                {teams.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, prevTeamId === t.id && styles.chipActive]}
                    onPress={() => setPrevTeamId(t.id)}
                  >
                    <Text style={[styles.chipText, prevTeamId === t.id && styles.chipTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Athletes */}
              <Text style={styles.label}>
                Atletas ({selectedAthletes.size}/{athletes.length})
              </Text>
              {athletesLoading ? (
                <ActivityIndicator color="#6366F1" />
              ) : athletes.length === 0 ? (
                <Text style={styles.hint}>El equipo no tiene atletas.</Text>
              ) : (
                <View style={styles.athleteList}>
                  {athletes.map((a) => {
                    const selected = selectedAthletes.has(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.athleteRow, selected && styles.athleteRowActive]}
                        onPress={() => toggleAthlete(a.id)}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                          {selected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.athleteName, selected && styles.athleteNameActive]}>
                          {a.full_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Exercises */}
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>
                  Ejercicios ({selectedExercises.length})
                </Text>
                <TouchableOpacity
                  style={styles.addExBtn}
                  onPress={() => setShowExerciseModal(true)}
                >
                  <Text style={styles.addExBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>

              {selectedExercises.length === 0 ? (
                <Text style={styles.hint}>Sin ejercicios aún. Agrega desde el catálogo.</Text>
              ) : (
                selectedExercises.map((ex, idx) => (
                  <View key={ex.id} style={styles.exCard}>
                    <View style={styles.exCardHeader}>
                      <Text style={styles.exCardName}>{ex.name}</Text>
                      <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.exCardCategory}>{ex.category}</Text>
                    <View style={styles.exFields}>
                      <View style={styles.exField}>
                        <Text style={styles.exFieldLabel}>Series</Text>
                        <TextInput
                          style={styles.exFieldInput}
                          value={ex.sets}
                          onChangeText={(v) => updateExerciseField(ex.id, "sets", v)}
                          keyboardType="numeric"
                          placeholderTextColor="#475569"
                        />
                      </View>
                      <View style={styles.exField}>
                        <Text style={styles.exFieldLabel}>Reps</Text>
                        <TextInput
                          style={styles.exFieldInput}
                          value={ex.reps}
                          onChangeText={(v) => updateExerciseField(ex.id, "reps", v)}
                          keyboardType="numeric"
                          placeholderTextColor="#475569"
                        />
                      </View>
                      <View style={styles.exField}>
                        <Text style={styles.exFieldLabel}>Seg.</Text>
                        <TextInput
                          style={styles.exFieldInput}
                          value={ex.duration_sec}
                          onChangeText={(v) => updateExerciseField(ex.id, "duration_sec", v)}
                          keyboardType="numeric"
                          placeholder="—"
                          placeholderTextColor="#475569"
                        />
                      </View>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={[styles.submitBtn, prevSubmitting && styles.submitBtnDisabled]}
                onPress={handleCreatePreventionSession}
                disabled={prevSubmitting}
              >
                <Text style={styles.submitText}>
                  {prevSubmitting ? "Creando..." : "Crear Sesión Preventiva"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Exercise Catalog Modal ────────────────────────────── */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Catálogo de Ejercicios</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalSearch}
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#475569"
            value={exerciseFilter}
            onChangeText={setExerciseFilter}
          />

          {exercisesLoading ? (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => {
                const alreadyAdded = selectedExercises.some((e) => e.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.exCatalogRow, alreadyAdded && styles.exCatalogRowAdded]}
                    onPress={() => !alreadyAdded && addExercise(item)}
                    disabled={alreadyAdded}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exCatalogName}>{item.name}</Text>
                      <Text style={styles.exCatalogMeta}>
                        {item.category}{item.sport ? ` · ${item.sport}` : ""}
                      </Text>
                      {item.instructions && (
                        <Text style={styles.exCatalogInstr} numberOfLines={2}>
                          {item.instructions}
                        </Text>
                      )}
                    </View>
                    <Text style={alreadyAdded ? styles.addedTag : styles.addTag}>
                      {alreadyAdded ? "✓ Añadido" : "+ Agregar"}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0F172A" },
  inner:        { padding: 20, paddingTop: 56, paddingBottom: 40 },
  title:        { color: "#F1F5F9", fontSize: 26, fontWeight: "800", marginBottom: 20 },

  tabRow:       { flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 12, padding: 4, marginBottom: 24 },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabBtnActive: { backgroundColor: "#6366F1" },
  tabBtnText:   { color: "#475569", fontWeight: "600", fontSize: 14 },
  tabBtnTextActive: { color: "#fff" },

  form:         { gap: 16 },
  label:        { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  hint:         { color: "#475569", fontSize: 13 },
  sectionTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sectionHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  input: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    color: "#F1F5F9",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },

  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive:   { backgroundColor: "#312E81", borderColor: "#6366F1" },
  chipText:     { color: "#64748B", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#818CF8" },

  submitBtn:    { backgroundColor: "#6366F1", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText:   { color: "#fff", fontWeight: "800", fontSize: 15 },

  backBtn:      { paddingVertical: 8 },
  backBtnText:  { color: "#818CF8", fontSize: 14, fontWeight: "600" },

  // Athlete selector
  athleteList:  { gap: 8 },
  athleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  athleteRowActive: { borderColor: "#6366F1", backgroundColor: "#1E1B4B" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { borderColor: "#6366F1", backgroundColor: "#6366F1" },
  checkmark:    { color: "#fff", fontSize: 13, fontWeight: "800" },
  athleteName:  { color: "#94A3B8", fontSize: 14, fontWeight: "500", flex: 1 },
  athleteNameActive: { color: "#E0E7FF" },

  // Add exercise button
  addExBtn:     { backgroundColor: "#1E293B", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155" },
  addExBtnText: { color: "#818CF8", fontWeight: "700", fontSize: 13 },

  // Exercise card in form
  exCard: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  exCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  exCardName:   { color: "#F1F5F9", fontSize: 14, fontWeight: "700", flex: 1 },
  exCardCategory: { color: "#64748B", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  removeBtn:    { color: "#EF4444", fontSize: 16, fontWeight: "700", paddingLeft: 12 },
  exFields:     { flexDirection: "row", gap: 12 },
  exField:      { flex: 1, gap: 4 },
  exFieldLabel: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  exFieldInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 8,
    color: "#F1F5F9",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
    textAlign: "center",
  },

  // Session cards
  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: { color: "#475569", fontSize: 14 },
  sessionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  sessionTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  sessionMeta:  { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sessionMetaText: { color: "#64748B", fontSize: 12 },
  badge:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGroup:   { backgroundColor: "#312E81" },
  badgeIndiv:   { backgroundColor: "#1E3A5F" },
  badgeSport:   { backgroundColor: "#064E3B", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:    { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#0F172A" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "800" },
  modalClose: { color: "#94A3B8", fontSize: 22 },
  modalSearch: {
    margin: 16,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    color: "#F1F5F9",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  exCatalogRow: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exCatalogRowAdded: { opacity: 0.5 },
  exCatalogName: { color: "#F1F5F9", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  exCatalogMeta: { color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  exCatalogInstr: { color: "#94A3B8", fontSize: 12, lineHeight: 16 },
  addTag:    { color: "#818CF8", fontWeight: "700", fontSize: 13, minWidth: 60, textAlign: "right" },
  addedTag:  { color: "#22C55E", fontWeight: "700", fontSize: 13, minWidth: 60, textAlign: "right" },
});
