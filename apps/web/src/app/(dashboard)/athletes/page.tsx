import { createClient } from "@/lib/supabase/server";
import { ACWR_ZONES, SPORT_LABELS, buildRuleInput, runPrescriptionRules } from "@vitatekh/shared";
import AthletesClient, { type AthleteRow } from "./AthletesClient";

export const dynamic = "force-dynamic";

function latestByAthlete<T extends { athlete_id: string }>(rows: T[] | null): Map<string, T> {
  const map = new Map<string, T>();
  for (const r of rows ?? []) if (!map.has(r.athlete_id)) map.set(r.athlete_id, r);
  return map;
}

export default async function AthletesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: teams } = await supabase
    .from("teams").select("id, name, sport").eq("professional_id", user!.id);
  const teamIds = (teams ?? []).map((t) => t.id);

  let athletes: AthleteRow[] = [];

  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select(
        `athlete_id, team_id,
         profiles!team_members_athlete_id_fkey (
           id, full_name, email, sport, role, avatar_url, created_at, updated_at
         )`
      )
      .in("team_id", teamIds);

    const athleteIds = (members ?? []).map((m) => m.athlete_id);

    const [
      { data: acwrData },
      { data: wellnessData },
      { data: rpeData },
      { data: ankleData },
      { data: fmsData },
      { data: painData },
    ] = await Promise.all([
      supabase.from("acwr_snapshots").select("*").in("athlete_id", athleteIds).order("date", { ascending: false }),
      supabase.from("daily_wellness").select("athlete_id, date, fatigue, soreness, mood").in("athlete_id", athleteIds).order("date", { ascending: false }),
      supabase.from("session_rpe").select("athlete_id, srpe, created_at").in("athlete_id", athleteIds).order("created_at", { ascending: false }),
      supabase.from("ankle_foot_assessments").select("athlete_id, assessment_date, wblt_cm_left, wblt_cm_right, dorsiflexion_rom_left, dorsiflexion_rom_right, single_leg_squat_left, single_leg_squat_right, agility_t_test_seconds, bosco_protocol").in("athlete_id", athleteIds).order("assessment_date", { ascending: false }),
      supabase.from("biomechanical_evaluations").select("athlete_id, date, fms_total, fms_injury_risk").in("athlete_id", athleteIds).order("date", { ascending: false }),
      supabase.from("pain_records").select("athlete_id, date, body_region, eva_score, traffic_light").in("athlete_id", athleteIds).order("date", { ascending: false }),
    ]);

    const latestAcwr = latestByAthlete(acwrData);
    const latestWellness = latestByAthlete(wellnessData);
    const latestRpe = latestByAthlete(rpeData);
    const latestAnkle = latestByAthlete(ankleData);
    const latestFms = latestByAthlete(fmsData);
    const latestPain = latestByAthlete(painData);

    const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

    athletes = (members ?? []).map((m) => {
      const profile = m.profiles as any;
      const wellness = latestWellness.get(m.athlete_id) ?? null;

      const prescriptions = runPrescriptionRules(
        buildRuleInput({
          id: profile.id,
          full_name: profile.full_name,
          sport: profile.sport ?? undefined,
          latest_acwr: latestAcwr.get(m.athlete_id) ?? null,
          latest_pain: latestPain.get(m.athlete_id) ?? null,
          latest_wellness: wellness,
          latest_biomech: latestFms.get(m.athlete_id) ?? null,
          latest_ankle_foot: latestAnkle.get(m.athlete_id) ?? null,
        })
      );

      const alertCount = prescriptions.filter(
        (p) => p.alert_level === "red" || p.alert_level === "orange"
      ).length;

      return {
        ...profile,
        latest_acwr: latestAcwr.get(m.athlete_id),
        team_name: teamMap.get(m.team_id),
        latest_srpe: latestRpe.get(m.athlete_id)?.srpe ?? null,
        wellness_fatigue: wellness?.fatigue ?? null,
        wellness_soreness: wellness?.soreness ?? null,
        alert_count: alertCount,
      } as AthleteRow;
    });
  }

  return <AthletesClient athletes={athletes} acwrZones={ACWR_ZONES} sportLabels={SPORT_LABELS} />;
}
