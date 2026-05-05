import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProfileDetail from "@/components/profile/ProfileDetail";

interface Props {
  params: { id: string };
}

export default async function AthleteDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Authorization: athlete must belong to this professional's teams ──────
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("professional_id", user!.id);

  const teamIds = (teams ?? []).map((t) => t.id);

  const { data: memberCheck } = await supabase
    .from("team_members")
    .select("athlete_id")
    .eq("athlete_id", params.id)
    .in("team_id", teamIds)
    .maybeSingle();

  if (!memberCheck) notFound();

  // ── Data fetching ────────────────────────────────────────────────────────

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!profile) notFound();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: acwrHistory }, { data: wellness }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("acwr_snapshots")
        .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
        .eq("athlete_id", params.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true }),

      supabase
        .from("daily_wellness")
        .select("date, fatigue, sleep_hours, sleep_quality, mood")
        .eq("athlete_id", params.id)
        .order("date", { ascending: false })
        .limit(7),

      supabase
        .from("training_sessions")
        .select(
          `id, date, duration_min, session_type, phase,
           session_rpe (rpe, srpe)`
        )
        .eq("athlete_id", params.id)
        .order("date", { ascending: false })
        .limit(10),
    ]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ProfileDetail
      profile={profile}
      athleteId={params.id}
      acwrHistory={acwrHistory ?? []}
      wellness={wellness ?? []}
      sessions={(sessions ?? []) as Parameters<typeof ProfileDetail>[0]["sessions"]}
    />
  );
}
