/**
 * Supabase Edge Function: calculate-acwr
 *
 * 1. Calcula ACWR para todos los atletas (o uno específico).
 * 2. Detecta transiciones de zona en < 24h → inserta notificaciones
 *    en coach_notifications para alertar al profesional.
 *
 * Método: Simple Moving Average (SMA)
 *   Acute  = suma sRPE últimos 7 días  (por training_sessions.date)
 *   Chronic = suma sRPE últimos 28 días / 4
 *   ACWR   = Acute / Chronic
 *
 * Deploy: supabase functions deploy calculate-acwr
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type RiskZone = "low" | "optimal" | "high" | "very_high";

function getRiskZone(ratio: number): RiskZone {
  if (ratio < 0.80) return "low";
  if (ratio < 1.30) return "optimal";
  if (ratio < 1.50) return "high";
  return "very_high";
}

/** Zonas que consideramos "seguras" (para detectar escalación) */
const SAFE_ZONES = new Set<RiskZone>(["low", "optimal"]);
/** Zonas que consideramos "en riesgo" */
const RISK_ZONES = new Set<RiskZone>(["high", "very_high"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0]!;

  // Ayer (para detectar transición en < 24h)
  const yesterday    = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0]!;

  // ── Opcional: atleta específico ────────────────────────────
  let athleteFilter: string | null = null;
  try {
    const body = await req.json();
    athleteFilter = body?.athlete_id ?? null;
  } catch { /* sin body → todos los atletas */ }

  // ── Resolver lista de atletas ──────────────────────────────
  let athleteIds: string[] = [];

  if (athleteFilter) {
    athleteIds = [athleteFilter];
  } else {
    const { data: athletes } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "athlete");
    athleteIds = (athletes ?? []).map((a: { id: string }) => a.id);
  }

  if (athleteIds.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Obtener snapshot de ayer para detectar transiciones ────
  const { data: yesterdaySnapshots } = await supabase
    .from("acwr_snapshots")
    .select("athlete_id, risk_zone")
    .in("athlete_id", athleteIds)
    .eq("date", yesterdayStr);

  const previousZoneMap = new Map<string, RiskZone>(
    (yesterdaySnapshots ?? []).map((s: any) => [s.athlete_id, s.risk_zone as RiskZone])
  );

  // ── Obtener mapa coach_id por atleta (para notificaciones) ─
  const { data: teamMembersData } = await supabase
    .from("team_members")
    .select("athlete_id, teams!inner(professional_id)")
    .in("athlete_id", athleteIds);

  const athleteCoachMap = new Map<string, string>();
  (teamMembersData ?? []).forEach((row: any) => {
    if (!athleteCoachMap.has(row.athlete_id)) {
      athleteCoachMap.set(row.athlete_id, row.teams.professional_id);
    }
  });

  // ── Ventanas de tiempo ─────────────────────────────────────
  const acute7dStart   = new Date(today);
  acute7dStart.setDate(acute7dStart.getDate() - 7);
  const acute7dStr     = acute7dStart.toISOString().split("T")[0]!;

  const chronic28dStart = new Date(today);
  chronic28dStart.setDate(chronic28dStart.getDate() - 28);
  const chronic28dStr   = chronic28dStart.toISOString().split("T")[0]!;

  const results: Array<{
    athlete_id: string;
    acwr: number;
    zone: RiskZone;
    transitioned: boolean;
  }> = [];
  const notifications: any[] = [];

  for (const athleteId of athleteIds) {
    // ── Obtener sRPE de las últimas 28 días (JOIN con fecha real) ─
    const { data: rpeData, error } = await supabase
      .from("session_rpe")
      .select(`
        srpe,
        training_sessions!session_rpe_session_id_fkey (date)
      `)
      .eq("athlete_id", athleteId)
      .gte("training_sessions.date", chronic28dStr)
      .lte("training_sessions.date", todayStr);

    if (error) {
      console.error(`[${athleteId}] Error RPE:`, error.message);
      continue;
    }

    const allRpe = (rpeData ?? []) as Array<{
      srpe: number;
      training_sessions: { date: string } | null;
    }>;

    const chronic = allRpe.filter((r) => r.training_sessions?.date != null);
    const acute   = chronic.filter((r) => r.training_sessions!.date >= acute7dStr);

    const acuteLoad   = acute.reduce((sum, r) => sum + r.srpe, 0);
    const chronicLoad = chronic.reduce((sum, r) => sum + r.srpe, 0) / 4;
    const acwrRatio   = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    const riskZone    = getRiskZone(acwrRatio);

    // ── Upsert snapshot ────────────────────────────────────────
    const { error: upsertErr } = await supabase
      .from("acwr_snapshots")
      .upsert(
        {
          athlete_id:   athleteId,
          date:         todayStr,
          acute_load:   acuteLoad,
          chronic_load: chronicLoad,
          acwr_ratio:   Math.round(acwrRatio * 1000) / 1000,
          risk_zone:    riskZone,
        },
        { onConflict: "athlete_id,date" }
      );

    if (upsertErr) {
      console.error(`[${athleteId}] Upsert error:`, upsertErr.message);
      continue;
    }

    // ── Detección de transición Verde → Rojo en < 24h ─────────
    const previousZone = previousZoneMap.get(athleteId) ?? null;
    const transitioned =
      previousZone !== null &&
      SAFE_ZONES.has(previousZone) &&
      RISK_ZONES.has(riskZone);

    const coachId = athleteCoachMap.get(athleteId);

    if (transitioned && coachId) {
      // Obtener nombre del atleta para el mensaje
      const { data: athleteProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", athleteId)
        .single();

      const athleteName = athleteProfile?.full_name ?? "Atleta";
      const isVeryCritical = riskZone === "very_high";

      notifications.push({
        coach_id:      coachId,
        athlete_id:    athleteId,
        type:          isVeryCritical ? "critical_acwr" : "zone_escalation",
        title:         isVeryCritical
          ? `🔴 ${athleteName} — ACWR Crítico`
          : `🟠 ${athleteName} — Escalada de Zona ACWR`,
        message: isVeryCritical
          ? `${athleteName} ha pasado de zona "${previousZone}" a "muy alta" (ACWR ${acwrRatio.toFixed(2)}) en menos de 24 horas. Intervención urgente recomendada.`
          : `${athleteName} ha pasado de zona "${previousZone}" a "alta" (ACWR ${acwrRatio.toFixed(2)}) en menos de 24 horas. Revisar carga de entrenamiento.`,
        previous_zone: previousZone,
        current_zone:  riskZone,
        data: {
          acwr_ratio:   acwrRatio,
          acute_load:   acuteLoad,
          chronic_load: chronicLoad,
          date:         todayStr,
        },
      });
    }

    // Notificación ACWR > 1.5 sin importar ayer (crítico absoluto)
    else if (riskZone === "very_high" && coachId) {
      const { data: athleteProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", athleteId)
        .single();
      const athleteName = athleteProfile?.full_name ?? "Atleta";

      // Solo notificar si no existe ya una notificación de hoy
      const { count } = await supabase
        .from("coach_notifications")
        .select("id", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("athlete_id", athleteId)
        .eq("type", "critical_acwr")
        .gte("created_at", `${todayStr}T00:00:00Z`);

      if ((count ?? 0) === 0) {
        notifications.push({
          coach_id:   coachId,
          athlete_id: athleteId,
          type:       "critical_acwr",
          title:      `🔴 ${athleteName} — ACWR Muy Alto`,
          message:    `${athleteName} tiene ACWR ${acwrRatio.toFixed(2)} (zona muy alta). Reducir carga urgentemente.`,
          current_zone: riskZone,
          data: { acwr_ratio: acwrRatio, acute_load: acuteLoad, chronic_load: chronicLoad, date: todayStr },
        });
      }
    }

    results.push({ athlete_id: athleteId, acwr: acwrRatio, zone: riskZone, transitioned });

    console.log(
      `[${athleteId}] acute=${acuteLoad} chronic=${chronicLoad.toFixed(1)} ` +
      `ACWR=${acwrRatio.toFixed(3)} zone=${riskZone}` +
      (transitioned ? ` ⚠ TRANSICIÓN ${previousZoneMap.get(athleteId)}→${riskZone}` : "")
    );
  }

  // ── Insertar notificaciones ────────────────────────────────
  if (notifications.length > 0) {
    const { error: notifError } = await supabase
      .from("coach_notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error insertando notificaciones:", notifError.message);
    } else {
      console.log(`📬 ${notifications.length} notificaciones generadas.`);
    }
  }

  const atRisk      = results.filter((r) => RISK_ZONES.has(r.zone));
  const transitions = results.filter((r) => r.transitioned);

  console.log(
    `✅ ACWR calculado: ${results.length}/${athleteIds.length} atletas. ` +
    `En riesgo: ${atRisk.length}. Transiciones Verde→Rojo: ${transitions.length}.`
  );

  return new Response(
    JSON.stringify({
      processed:           results.length,
      at_risk:             atRisk.length,
      zone_escalations:    transitions.length,
      notifications_sent:  notifications.length,
      results,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
