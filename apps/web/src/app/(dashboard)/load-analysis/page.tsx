import { createClient } from "@/lib/supabase/server";
import { SPORT_LABELS } from "@vitatekh/shared";
import LoadAnalysisClient from "./LoadAnalysisClient";

export default async function LoadAnalysisPage({
  searchParams,
}: {
  searchParams: { athlete?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get all athletes from professional's teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport")
    .eq("professional_id", user!.id);

  const teamIds = (teams ?? []).map((t) => t.id);

  let athletes: { id: string; full_name: string; sport: string | null }[] = [];
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select(
        "athlete_id, profiles!team_members_athlete_id_fkey(id, full_name, sport)"
      )
      .in("team_id", teamIds);

    athletes = (members ?? []).map((m) => m.profiles as any).filter(Boolean);
    // Dedupe
    athletes = Array.from(new Map(athletes.map((a) => [a.id, a])).values());
  }

  const selectedId = searchParams.athlete ?? athletes[0]?.id ?? null;

  // Load data for selected athlete
  let acwrHistory: any[] = [];
  let weeklyLoads: any[] = [];
  let wellnessTrend: any[] = [];

  if (selectedId) {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const dateStr = sixtyDaysAgo.toISOString().split("T")[0]!;

    const [acwrRes, sessionsRes, wellnessRes] = await Promise.all([
      supabase
        .from("acwr_snapshots")
        .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
        .eq("athlete_id", selectedId)
        .gte("date", dateStr)
        .order("date", { ascending: true }),

      supabase
        .from("training_sessions")
        .select("date, duration_min, session_rpe(rpe, srpe)")
        .eq("athlete_id", selectedId)
        .gte("date", dateStr)
        .order("date", { ascending: true }),

      supabase
        .from("daily_wellness")
        .select("date, fatigue, sleep_hours, mood")
        .eq("athlete_id", selectedId)
        .gte("date", dateStr)
        .order("date", { ascending: true }),
    ]);

    acwrHistory = acwrRes.data ?? [];

    // Aggregate sessions by ISO week
    const weekMap = new Map<
      string,
      { week: string; volume: number; intensity: number; srpe: number; count: number }
    >();
    for (const s of sessionsRes.data ?? []) {
      const d = new Date(s.date);
      const dayOfWeek = d.getDay();
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - ((dayOfWeek + 6) % 7)); // Monday
      const weekKey = startOfWeek.toISOString().split("T")[0]!;

      const existing = weekMap.get(weekKey) ?? {
        week: weekKey,
        volume: 0,
        intensity: 0,
        srpe: 0,
        count: 0,
      };
      const rpe = (s.session_rpe as any[])?.[0];
      existing.volume += s.duration_min;
      existing.srpe += rpe?.srpe ?? 0;
      existing.intensity += rpe?.rpe ?? 0;
      existing.count += 1;
      weekMap.set(weekKey, existing);
    }
    weeklyLoads = Array.from(weekMap.values()).map((w) => ({
      ...w,
      avgIntensity: w.count > 0 ? w.intensity / w.count : 0,
    }));

    wellnessTrend = wellnessRes.data ?? [];
  }

  return (
    <LoadAnalysisClient
      athletes={athletes}
      selectedId={selectedId}
      acwrHistory={acwrHistory}
      weeklyLoads={weeklyLoads}
      wellnessTrend={wellnessTrend}
      sportLabels={SPORT_LABELS}
    />
  );
}
