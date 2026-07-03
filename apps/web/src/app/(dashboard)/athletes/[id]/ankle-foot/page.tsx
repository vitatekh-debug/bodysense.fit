import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import AnkleFootForm from "./AnkleFootForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnkleFootPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: athlete } = await supabase
    .from("profiles")
    .select("id, full_name, sport")
    .eq("id", params.id)
    .single();

  if (!athlete) notFound();

  // Última evaluación previa (referencia para el profesional)
  const { data: lastAssessment } = await supabase
    .from("ankle_foot_assessments")
    .select("assessment_date, wblt_cm_left, wblt_cm_right, agility_t_test_seconds")
    .eq("athlete_id", params.id)
    .order("assessment_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href={`/athletes/${params.id}`}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        ← Volver al perfil
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          Evaluación de Tobillo, Pie y Rendimiento Funcional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {athlete.full_name}
          {lastAssessment && (
            <span className="ml-2 text-slate-600">
              · Última evaluación:{" "}
              {new Date(lastAssessment.assessment_date).toLocaleDateString("es-CO")}
            </span>
          )}
        </p>
      </div>

      <AnkleFootForm athleteId={athlete.id} professionalId={user.id} />
    </div>
  );
}
