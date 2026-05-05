/**
 * Plan Page — Server Component
 *
 * Ruta: /athletes/[id]/plan
 *
 * Responsabilidades:
 *   1. Auth guard — el atleta debe pertenecer a uno de los equipos del profesional.
 *   2. Fetch paralelo de profile + acwr_snapshots + planned_sessions (semana actual ±3 semanas).
 *   3. Delega todo el estado interactivo a <PlanClient />.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanClient from "./PlanClient";
import type { Metadata } from "next";

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Planificación de Entrenamiento",
};

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  params: { id: string };
}

export default async function PlanPage({ params }: Props) {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Verificar que el atleta pertenece a uno de los equipos del profesional
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("professional_id", user.id);

  const teamIds = (teams ?? []).map((t) => t.id);

  const { data: memberCheck } = await supabase
    .from("team_members")
    .select("athlete_id, team_id")
    .eq("athlete_id", params.id)
    .in("team_id", teamIds)
    .maybeSingle();

  if (!memberCheck) notFound();

  const teamId = memberCheck.team_id as string;

  // ── Ventana temporal ────────────────────────────────────────────────────────
  // Cargamos desde hoy -21 días hasta hoy +35 días:
  //   • Pasado cercano para calcular ACWR crónico de referencia
  //   • Futuro para mostrar la planificación de las próximas semanas
  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 21);
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + 35);

  const startStr = windowStart.toISOString().split("T")[0]!;
  const endStr   = windowEnd.toISOString().split("T")[0]!;

  // ── Fetch paralelo ──────────────────────────────────────────────────────────
  const [
    { data: profile },
    { data: acwrHistory },
    { data: plannedSessions },
  ] = await Promise.all([
    // Perfil del atleta
    supabase
      .from("profiles")
      .select("id, full_name, sport, email")
      .eq("id", params.id)
      .single(),

    // Snapshots ACWR recientes para calcular carga crónica
    supabase
      .from("acwr_snapshots")
      .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
      .eq("athlete_id", params.id)
      .gte("date", startStr)
      .order("date", { ascending: false })
      .limit(28),

    // Sesiones planificadas en la ventana
    supabase
      .from("planned_sessions")
      .select(
        "id, date, session_type, phase, duration_min, description, rpe_target, srpe_projected"
      )
      .eq("athlete_id", params.id)
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true }),
  ]);

  if (!profile) notFound();

  // ── Extraer métricas ACWR actuales ──────────────────────────────────────────
  // El primer snapshot (más reciente) da el ACWR base para proyecciones
  const latestAcwr = acwrHistory?.[0];

  return (
    <PlanClient
      athleteId={params.id}
      teamId={teamId}
      profile={profile}
      plannedSessions={plannedSessions ?? []}
      currentAcwr={latestAcwr?.acwr_ratio ?? null}
      acuteLoad={latestAcwr?.acute_load ?? null}
      chronicLoad={latestAcwr?.chronic_load ?? null}
    />
  );
}
