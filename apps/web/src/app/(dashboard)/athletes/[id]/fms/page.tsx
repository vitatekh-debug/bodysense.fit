import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import FmsForm from "./FmsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FmsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: athlete } = await supabase
    .from("profiles")
    .select("id, full_name, sport")
    .eq("id", params.id)
    .single();
  if (!athlete) notFound();

  const { data: last } = await supabase
    .from("biomechanical_evaluations")
    .select("date, fms_total")
    .eq("athlete_id", params.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href={`/athletes/${params.id}?tab=evaluacion`}
        className="text-sm text-brand hover:text-brand transition-colors"
      >
        ← Volver al centro de evaluación
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold text-ink">Evaluación Funcional FMS</h1>
        <p className="text-sm text-ink-soft mt-1">
          {athlete.full_name}
          {last && (
            <span className="ml-2 text-ink-muted">
              · Último: {new Date(last.date).toLocaleDateString("es-CO")}
              {last.fms_total != null && ` (${last.fms_total}/21)`}
            </span>
          )}
        </p>
      </div>

      <FmsForm athleteId={athlete.id} professionalId={user.id} />
    </div>
  );
}
