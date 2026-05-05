/**
 * Athlete Detail Page — Server Component
 *
 * Minimal fast path:
 *   1. Auth guard — professional must own a team containing this athlete
 *   2. Profile + latest ACWR snapshot (2 lightweight queries in parallel)
 *   3. Delegates heavy data sections to ProfileDetail via Suspense boundaries
 *
 * This keeps Time To First Byte minimal: the shell + header render immediately,
 * then metric cards / chart / wellness / sessions stream in independently.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileDetail from "@/components/profile/ProfileDetail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perfil de Atleta",
};

interface Props {
  params: { id: string };
}

export default async function AthleteDetailPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("professional_id", user.id);

  const teamIds = (teams ?? []).map((t) => t.id);

  const { data: memberCheck } = await supabase
    .from("team_members")
    .select("athlete_id")
    .eq("athlete_id", params.id)
    .in("team_id", teamIds)
    .maybeSingle();

  if (!memberCheck) notFound();

  // ── Fast parallel fetch: profile + latest ACWR (needed for the header) ─────
  const [{ data: profile }, { data: latestAcwrArr }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),

    supabase
      .from("acwr_snapshots")
      .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
      .eq("athlete_id", params.id)
      .order("date", { ascending: false })
      .limit(1),
  ]);

  if (!profile) notFound();

  // ── Render shell — heavy sections stream via Suspense in ProfileDetail ──────
  return (
    <ProfileDetail
      profile={profile}
      athleteId={params.id}
      latestAcwr={latestAcwrArr?.[0] ?? null}
    />
  );
}
