import { createClient } from "@/lib/supabase/server";
import { ACWR_ZONES, SPORT_LABELS } from "@vitatekh/shared";
import type { AthleteWithAcwr } from "@vitatekh/shared";
import AthletesClient from "./AthletesClient";

export const dynamic = "force-dynamic";

export default async function AthletesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport")
    .eq("professional_id", user!.id);

  const teamIds = (teams ?? []).map((t) => t.id);

  let athletes: AthleteWithAcwr[] = [];

  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select(
        `athlete_id,
         team_id,
         profiles!team_members_athlete_id_fkey (
           id, full_name, email, sport, role, avatar_url, created_at, updated_at
         )`
      )
      .in("team_id", teamIds);

    const athleteIds = (members ?? []).map((m) => m.athlete_id);

    const { data: acwrData } = await supabase
      .from("acwr_snapshots")
      .select("*")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false });

    const latestAcwr = new Map<string, NonNullable<typeof acwrData>[number]>();
    (acwrData ?? []).forEach((s) => {
      if (!latestAcwr.has(s.athlete_id)) latestAcwr.set(s.athlete_id, s);
    });

    // Get team name per athlete
    const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

    athletes = (members ?? []).map((m) => ({
      ...(m.profiles as any),
      latest_acwr: latestAcwr.get(m.athlete_id),
      team_name: teamMap.get(m.team_id),
    }));
  }

  return <AthletesClient athletes={athletes} acwrZones={ACWR_ZONES} sportLabels={SPORT_LABELS} />;
}
