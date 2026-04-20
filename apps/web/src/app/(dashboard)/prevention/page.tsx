import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PreventionClient from "./PreventionClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PreventionPage({
  searchParams,
}: {
  searchParams: { tab?: string; athlete?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ── 1. Teams del profesional ──────────────────────────────────────
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport");
  const teamIds = (teams ?? []).map((t) => t.id);

  // ── 2. Atletas del profesional ───────────────────────────────────
  let athleteIds: string[] = [];
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("athlete_id")
      .in("team_id", teamIds);
    athleteIds = [...new Set((members ?? []).map((m) => m.athlete_id))];
  }

  let athletes: any[] = [];
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, sport")
      .in("id", athleteIds);
    athletes = profiles ?? [];
  }

  // ── 3. Últimos registros de dolor (EVA) ─────────────────────────
  let painRecords: any[] = [];
  if (athleteIds.length > 0) {
    const { data } = await supabase
      .from("pain_records")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(100);
    painRecords = data ?? [];
  }

  // Latest per athlete
  const latestPain = new Map<string, any>();
  painRecords.forEach((r) => {
    if (!latestPain.has(r.athlete_id)) latestPain.set(r.athlete_id, r);
  });

  // ── 4. Últimas evaluaciones POMS ─────────────────────────────────
  let pomsRecords: any[] = [];
  if (athleteIds.length > 0) {
    const { data } = await supabase
      .from("poms_assessments")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(100);
    pomsRecords = data ?? [];
  }

  const latestPoms = new Map<string, any>();
  pomsRecords.forEach((r) => {
    if (!latestPoms.has(r.athlete_id)) latestPoms.set(r.athlete_id, r);
  });

  // ── 5. Últimas evaluaciones H/Q ──────────────────────────────────
  let hqRecords: any[] = [];
  if (athleteIds.length > 0) {
    const { data } = await supabase
      .from("hq_evaluations")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(100);
    hqRecords = data ?? [];
  }

  const latestHq = new Map<string, any>();
  hqRecords.forEach((r) => {
    if (!latestHq.has(r.athlete_id)) latestHq.set(r.athlete_id, r);
  });

  // ── 6. Últimas evaluaciones biomecánicas (FMS) ───────────────────
  let biomechRecords: any[] = [];
  if (athleteIds.length > 0) {
    const { data } = await supabase
      .from("biomechanical_evaluations")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(100);
    biomechRecords = data ?? [];
  }

  const latestBiomech = new Map<string, any>();
  biomechRecords.forEach((r) => {
    if (!latestBiomech.has(r.athlete_id)) latestBiomech.set(r.athlete_id, r);
  });

  // ── 7. Sesiones preventivas recientes + completion ───────────────
  const { data: preventionSessions } = await supabase
    .from("prevention_sessions")
    .select(`
      id, title, description, date, type, sport,
      prevention_athletes (
        id,
        athlete_id,
        completed_at,
        profiles!prevention_athletes_athlete_id_fkey (full_name)
      )
    `)
    .eq("created_by", user.id)
    .order("date", { ascending: false })
    .limit(20);

  // ── 8. Combinar datos por atleta ─────────────────────────────────
  const athleteSmcp = athletes.map((a) => ({
    ...a,
    latest_pain:   latestPain.get(a.id)   ?? null,
    latest_poms:   latestPoms.get(a.id)   ?? null,
    latest_hq:     latestHq.get(a.id)     ?? null,
    latest_biomech:latestBiomech.get(a.id)?? null,
  }));

  // ── 9. Summary alerts ────────────────────────────────────────────
  const redPain    = athleteSmcp.filter((a) => a.latest_pain?.traffic_light === "red");
  const yellowPain = athleteSmcp.filter((a) => a.latest_pain?.traffic_light === "yellow");
  const hqRisk     = athleteSmcp.filter((a) => a.latest_hq?.risk_flag === true);
  const fmsRisk    = athleteSmcp.filter((a) => a.latest_biomech?.fms_injury_risk === true);
  const pomsRisk   = athleteSmcp.filter((a) => (a.latest_poms?.tmd_score ?? -999) > 20);

  return (
    <PreventionClient
      athletes={athleteSmcp}
      preventionSessions={preventionSessions ?? []}
      alerts={{ redPain, yellowPain, hqRisk, fmsRisk, pomsRisk }}
      initialTab={searchParams.tab ?? "overview"}
    />
  );
}
