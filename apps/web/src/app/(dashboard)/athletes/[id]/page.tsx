/**
 * Athlete Detail Page — Server Component
 *
 * Auth guard + fetch de todos los datos del perfil, que se pasan al
 * componente cliente ProfileTabs (3 pestañas con transiciones).
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildRuleInput, runPrescriptionRules } from "@vitatekh/shared";
import ProfileTabs from "@/components/profile/ProfileTabs";
import type { WeaknessItem, InjuryItem } from "@/components/profile/ProfileTabs";
import type { TrendPoint } from "@/components/profile/MetricTrendChart";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil de Atleta" };
export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

const PAIN_REGION_LABELS: Record<string, string> = {
  hamstring_left: "Isquiotibial izq.", hamstring_right: "Isquiotibial der.",
  knee_left: "Rodilla izq.", knee_right: "Rodilla der.",
  ankle_left: "Tobillo izq.", ankle_right: "Tobillo der.",
  lumbar: "Zona lumbar", thoracic: "Zona torácica",
  hip_left: "Cadera izq.", hip_right: "Cadera der.",
  groin_left: "Ingle izq.", groin_right: "Ingle der.",
  quadriceps_left: "Cuádriceps izq.", quadriceps_right: "Cuádriceps der.",
  calf_left: "Gemelo izq.", calf_right: "Gemelo der.",
  shoulder_left: "Hombro izq.", shoulder_right: "Hombro der.",
  foot_left: "Pie izq.", foot_right: "Pie der.",
};

function regionLabel(r: string): string {
  return PAIN_REGION_LABELS[r] ?? r.replace(/_/g, " ");
}

export default async function AthleteDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { data: teams } = await supabase
    .from("teams").select("id").eq("professional_id", user.id);
  const teamIds = (teams ?? []).map((t) => t.id);

  const { data: memberCheck } = await supabase
    .from("team_members")
    .select("athlete_id")
    .eq("athlete_id", params.id)
    .in("team_id", teamIds)
    .maybeSingle();
  if (!memberCheck) notFound();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyIso = thirtyDaysAgo.toISOString().split("T")[0]!;

  // ── Fetch en paralelo ─────────────────────────────────────────────────────
  const [
    { data: profile },
    { data: acwrHistory },
    { count: sessionCount },
    { data: recentSessions },
    { data: wellnessRows },
    { data: ankleFootRows },
    { data: fmsRows },
    { data: painRows },
    { data: pomsRows },
    { data: hqRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),
    supabase.from("acwr_snapshots")
      .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
      .eq("athlete_id", params.id).gte("date", thirtyIso).order("date", { ascending: true }),
    supabase.from("training_sessions")
      .select("id", { count: "exact", head: true }).eq("athlete_id", params.id),
    supabase.from("training_sessions")
      .select("id, date, session_rpe (srpe)")
      .eq("athlete_id", params.id).order("date", { ascending: false }).limit(1),
    supabase.from("daily_wellness")
      .select("date, fatigue, sleep_hours, mood, soreness")
      .eq("athlete_id", params.id).order("date", { ascending: false }).limit(1),
    supabase.from("ankle_foot_assessments")
      .select("assessment_date, wblt_cm_left, wblt_cm_right, dorsiflexion_rom_left, dorsiflexion_rom_right, single_leg_squat_left, single_leg_squat_right, agility_t_test_seconds, bosco_protocol")
      .eq("athlete_id", params.id).order("assessment_date", { ascending: true }),
    supabase.from("biomechanical_evaluations")
      .select("date, fms_total, fms_injury_risk, surface_type, footwear_type")
      .eq("athlete_id", params.id).order("date", { ascending: true }),
    supabase.from("pain_records")
      .select("date, body_region, eva_score, traffic_light")
      .eq("athlete_id", params.id).order("date", { ascending: false }).limit(20),
    supabase.from("poms_assessments")
      .select("vigor, tmd_score, confusion, fatigue_poms")
      .eq("athlete_id", params.id).order("date", { ascending: false }).limit(1),
    supabase.from("hq_evaluations")
      .select("hq_ratio, ratio_type, risk_flag")
      .eq("athlete_id", params.id).order("date", { ascending: false }).limit(1),
  ]);

  if (!profile) notFound();

  const latestAcwr = acwrHistory && acwrHistory.length > 0
    ? acwrHistory[acwrHistory.length - 1]!
    : null;

  const latestSrpe = (recentSessions?.[0] as any)?.session_rpe?.[0]?.srpe ?? null;

  // ── Latest ankle-foot + FMS ────────────────────────────────────────────────
  const latestAnkle: any = ankleFootRows && ankleFootRows.length > 0
    ? ankleFootRows[ankleFootRows.length - 1] : null;
  const latestFms: any = fmsRows && fmsRows.length > 0
    ? fmsRows[fmsRows.length - 1] : null;

  // ── Debilidades derivadas ──────────────────────────────────────────────────
  const weaknesses: WeaknessItem[] = [];
  if (latestAnkle) {
    const wl = latestAnkle.wblt_cm_left, wr = latestAnkle.wblt_cm_right;
    if (wl != null && wl < 10) weaknesses.push({ label: `Déficit de movilidad de tobillo izquierdo (WBLT ${wl} cm)`, severity: "high" });
    if (wr != null && wr < 10) weaknesses.push({ label: `Déficit de movilidad de tobillo derecho (WBLT ${wr} cm)`, severity: "high" });
    const dl = latestAnkle.dorsiflexion_rom_left, dr = latestAnkle.dorsiflexion_rom_right;
    if (dl != null && dl < 15) weaknesses.push({ label: `Dorsiflexión limitada izquierda (${dl}°)`, severity: "medium" });
    if (dr != null && dr < 15) weaknesses.push({ label: `Dorsiflexión limitada derecha (${dr}°)`, severity: "medium" });
    const slsL = latestAnkle.single_leg_squat_left, slsR = latestAnkle.single_leg_squat_right;
    if (slsL?.knee_valgus || slsR?.knee_valgus) weaknesses.push({ label: "Valgo dinámico de rodilla en sentadilla unipodal", severity: "medium" });
    const bosco = latestAnkle.bosco_protocol;
    if (bosco?.drop_jump_rsi != null && bosco.drop_jump_rsi < 1.0) weaknesses.push({ label: `Fuerza reactiva baja (RSI ${bosco.drop_jump_rsi})`, severity: "low" });
    if (latestAnkle.agility_t_test_seconds != null && latestAnkle.agility_t_test_seconds > 11.5) weaknesses.push({ label: `Agilidad bajo baremo (T-Test ${latestAnkle.agility_t_test_seconds}s)`, severity: "low" });
  }
  if (latestFms?.fms_injury_risk) {
    weaknesses.push({ label: `Riesgo por patrón de movimiento (FMS ${latestFms.fms_total}/21)`, severity: "medium" });
  }

  // ── Lesiones activas (dolor EVA ≥ 4, último por región) ────────────────────
  const injuries: InjuryItem[] = [];
  const seenRegions = new Set<string>();
  for (const p of painRows ?? []) {
    if ((p.eva_score ?? 0) >= 4 && !seenRegions.has(p.body_region)) {
      seenRegions.add(p.body_region);
      injuries.push({ region: regionLabel(p.body_region), eva: p.eva_score, date: p.date });
    }
  }

  // ── Prescripciones (motor de reglas) ───────────────────────────────────────
  const latestPain = painRows?.[0];
  const prescriptions = runPrescriptionRules(
    buildRuleInput({
      id: params.id,
      full_name: profile.full_name,
      sport: profile.sport ?? undefined,
      latest_acwr: latestAcwr,
      latest_poms: pomsRows?.[0] ?? null,
      latest_hq: hqRows?.[0] ?? null,
      latest_pain: latestPain ?? null,
      latest_wellness: wellnessRows?.[0] ?? null,
      latest_biomech: latestFms ?? null,
      latest_ankle_foot: latestAnkle ?? null,
    })
  );

  // ── Trends para la pestaña de evolución ────────────────────────────────────
  const wbltTrend: TrendPoint[] = (ankleFootRows ?? []).map((r: any) => ({
    date: r.assessment_date,
    value: r.wblt_cm_left != null && r.wblt_cm_right != null
      ? Math.min(r.wblt_cm_left, r.wblt_cm_right)
      : (r.wblt_cm_left ?? r.wblt_cm_right ?? null),
  }));
  const rsiTrend: TrendPoint[] = (ankleFootRows ?? []).map((r: any) => ({
    date: r.assessment_date, value: r.bosco_protocol?.drop_jump_rsi ?? null,
  }));
  const tTestTrend: TrendPoint[] = (ankleFootRows ?? []).map((r: any) => ({
    date: r.assessment_date, value: r.agility_t_test_seconds ?? null,
  }));
  const fmsTrend: TrendPoint[] = (fmsRows ?? []).map((r: any) => ({
    date: r.date, value: r.fms_total ?? null,
  }));

  // ── Datos de las tarjetas del Centro de Evaluación ─────────────────────────
  const evalAnkleFoot = {
    lastDate: latestAnkle?.assessment_date ?? null,
    lastSummary: latestAnkle
      ? [
          latestAnkle.wblt_cm_left != null && `WBLT ${Math.min(latestAnkle.wblt_cm_left, latestAnkle.wblt_cm_right ?? latestAnkle.wblt_cm_left)}cm`,
          latestAnkle.agility_t_test_seconds != null && `T-Test ${latestAnkle.agility_t_test_seconds}s`,
        ].filter(Boolean).join(" · ") || null
      : null,
  };
  const evalFms = {
    lastDate: latestFms?.date ?? null,
    lastSummary: latestFms?.fms_total != null ? `FMS ${latestFms.fms_total}/21` : null,
  };
  const evalLoad = {
    lastDate: (recentSessions?.[0] as any)?.date ?? null,
    lastSummary: latestSrpe != null ? `Último sRPE ${latestSrpe} UA` : null,
  };

  return (
    <ProfileTabs
      profile={profile}
      athleteId={params.id}
      latestAcwr={latestAcwr}
      acwrHistory={acwrHistory ?? []}
      sessionCount={sessionCount ?? 0}
      latestSrpe={latestSrpe}
      weaknesses={weaknesses}
      injuries={injuries}
      prescriptions={prescriptions}
      evalAnkleFoot={evalAnkleFoot}
      evalFms={evalFms}
      evalLoad={evalLoad}
      wbltTrend={wbltTrend}
      rsiTrend={rsiTrend}
      tTestTrend={tTestTrend}
      fmsTrend={fmsTrend}
    />
  );
}
