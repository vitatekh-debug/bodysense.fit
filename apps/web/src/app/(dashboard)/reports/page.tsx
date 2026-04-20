import { createClient } from "@/lib/supabase/server";
import {
  ACWR_ZONES,
  SPORT_LABELS,
  buildRuleInput,
  runPrescriptionRules,
} from "@vitatekh/shared";
import ReportsClient from "./ReportsClient";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ── 1. Equipos ────────────────────────────────────────────
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport");
  const teamIds = (teams ?? []).map((t: any) => t.id);

  // ── 2. Miembros → atletas ─────────────────────────────────
  let athleteIds: string[] = [];
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("athlete_id, team_id")
      .in("team_id", teamIds);

    // map athlete → team
    const athleteTeamMap: Record<string, string> = {};
    (members ?? []).forEach((m: any) => {
      if (!athleteTeamMap[m.athlete_id]) athleteTeamMap[m.athlete_id] = m.team_id;
    });

    athleteIds = Object.keys(athleteTeamMap);

    if (athleteIds.length === 0) {
      return <EmptyState />;
    }

    const [
      profilesRes,
      acwrRes, pomsRes, painRes, hqRes, biomechRes, wellnessRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, sport, created_at")
        .in("id", athleteIds),
      supabase
        .from("acwr_snapshots")
        .select("athlete_id, date, acwr_ratio, acute_load, chronic_load, risk_zone")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false }),
      supabase
        .from("poms_assessments")
        .select("athlete_id, date, tmd_score, vigor, confusion, fatigue_poms")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(athleteIds.length * 3),
      supabase
        .from("pain_records")
        .select("athlete_id, date, eva_score, traffic_light, body_region")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(athleteIds.length * 3),
      supabase
        .from("hq_evaluations")
        .select("athlete_id, date, hq_ratio, ratio_type, risk_flag, side")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(athleteIds.length * 2),
      supabase
        .from("biomechanical_evaluations")
        .select("athlete_id, date, fms_total, fms_injury_risk, fms_has_pain_pattern, surface_type, footwear_type")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(athleteIds.length),
      supabase
        .from("daily_wellness")
        .select("athlete_id, date, fatigue, sleep_hours, mood")
        .in("athlete_id", athleteIds)
        .order("date", { ascending: false })
        .limit(athleteIds.length * 3),
    ]);

    function latestByAthlete(rows: any[]) {
      const map = new Map<string, any>();
      for (const row of rows) {
        if (!map.has(row.athlete_id)) map.set(row.athlete_id, row);
      }
      return map;
    }

    const latestAcwr     = latestByAthlete(acwrRes.data    ?? []);
    const latestPoms     = latestByAthlete(pomsRes.data    ?? []);
    const latestPain     = latestByAthlete(painRes.data    ?? []);
    const latestHq       = latestByAthlete(hqRes.data      ?? []);
    const latestBiomech  = latestByAthlete(biomechRes.data ?? []);
    const latestWellness = latestByAthlete(wellnessRes.data ?? []);

    const athletes = (profilesRes.data ?? []).map((p: any) => {
      const base = {
        ...p,
        team_id:         athleteTeamMap[p.id],
        latest_acwr:     latestAcwr.get(p.id)     ?? null,
        latest_poms:     latestPoms.get(p.id)     ?? null,
        latest_pain:     latestPain.get(p.id)     ?? null,
        latest_hq:       latestHq.get(p.id)       ?? null,
        latest_biomech:  latestBiomech.get(p.id)  ?? null,
        latest_wellness: latestWellness.get(p.id) ?? null,
      };
      const prescriptions = runPrescriptionRules(buildRuleInput(base));
      return { ...base, prescriptions };
    });

    const teamsWithAthletes = (teams ?? []).map((t: any) => ({
      ...t,
      athletes: athletes.filter((a: any) => a.team_id === t.id),
    }));

    const generatedAt = new Date().toLocaleString("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
    });

    return (
      <ReportsClient
        teamsWithAthletes={teamsWithAthletes}
        generatedAt={generatedAt}
        acwrZones={ACWR_ZONES}
        sportLabels={SPORT_LABELS}
      />
    );
  }

  return <EmptyState />;
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-100">Informes</h1>
        <p className="text-slate-400 text-sm mt-1">Exportación y resumen del equipo</p>
      </div>
      <div className="bg-surface border border-slate-700 rounded-xl p-16 text-center">
        <p className="text-slate-500 text-sm">No tienes atletas registrados.</p>
      </div>
    </div>
  );
}
