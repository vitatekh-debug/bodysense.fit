import { createClient } from "@/lib/supabase/server";
import PeriodizationClient from "./PeriodizationClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PeriodizationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // ── Equipos del profesional ───────────────────────────────────
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport");

  // ── Planes de periodización ───────────────────────────────────
  const { data: plans } = await supabase
    .from("periodization_plans")
    .select("*")
    .eq("created_by", user.id)
    .order("start_date", { ascending: false });

  // ── Ciclos de cada plan ───────────────────────────────────────
  let cycles: any[] = [];
  if ((plans ?? []).length > 0) {
    const planIds = (plans ?? []).map((p: any) => p.id);
    const { data } = await supabase
      .from("periodization_cycles")
      .select("*")
      .in("plan_id", planIds)
      .order("start_date", { ascending: true });
    cycles = data ?? [];
  }

  return (
    <PeriodizationClient
      teams={teams ?? []}
      plans={plans ?? []}
      cycles={cycles}
      userId={user.id}
    />
  );
}
