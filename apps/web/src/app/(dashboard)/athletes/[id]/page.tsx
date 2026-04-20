import { createClient } from "@/lib/supabase/server";
import { ACWR_ZONES, SPORT_LABELS, formatDate } from "@vitatekh/shared";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import AcwrHistoryChart from "./AcwrHistoryChart";
import RecalculateButton from "./RecalculateButton";

interface Props {
  params: { id: string };
}

export default async function AthleteDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify athlete belongs to this professional's teams
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

  // Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!profile) notFound();

  // Last 30 days ACWR history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: acwrHistory } = await supabase
    .from("acwr_snapshots")
    .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
    .eq("athlete_id", params.id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  // Last 7 wellness entries
  const { data: wellness } = await supabase
    .from("daily_wellness")
    .select("date, fatigue, sleep_hours, sleep_quality, mood")
    .eq("athlete_id", params.id)
    .order("date", { ascending: false })
    .limit(7);

  // Last 10 sessions with RPE
  const { data: sessions } = await supabase
    .from("training_sessions")
    .select(`
      id, date, duration_min, session_type, phase,
      session_rpe (rpe, srpe)
    `)
    .eq("athlete_id", params.id)
    .order("date", { ascending: false })
    .limit(10);

  const latest = acwrHistory?.at(-1);
  const zone = latest ? ACWR_ZONES[latest.risk_zone as keyof typeof ACWR_ZONES] : null;

  const initials = profile.full_name
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/athletes"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition"
      >
        <ArrowLeft size={16} />
        Volver a atletas
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center text-brand-light text-xl font-black">
          {initials}
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-100">{profile.full_name}</h1>
          <p className="text-slate-400 mt-1">
            {profile.sport ? SPORT_LABELS[profile.sport] ?? profile.sport : "Sin deporte"} · {profile.email}
          </p>
        </div>

        <div className="ml-auto">
          <RecalculateButton athleteId={params.id} />
        </div>
      </div>

      {/* ACWR Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-slate-700 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">ACWR</p>
          <p
            className="text-4xl font-black"
            style={{ color: zone?.color ?? "#94a3b8" }}
          >
            {latest?.acwr_ratio.toFixed(2) ?? "—"}
          </p>
          {zone && (
            <span
              className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: zone.color, backgroundColor: zone.color + "22" }}
            >
              {zone.label}
            </span>
          )}
        </div>
        <MetricCard label="Carga Aguda (7d)" value={latest?.acute_load.toFixed(0) ?? "—"} unit="UA" />
        <MetricCard label="Carga Crónica (28d)" value={latest?.chronic_load.toFixed(0) ?? "—"} unit="UA" />
        <MetricCard label="Sesiones" value={String(sessions?.length ?? 0)} unit="recientes" />
      </div>

      {/* ACWR Chart */}
      {acwrHistory && acwrHistory.length > 0 ? (
        <div className="bg-surface border border-slate-700 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
            Evolución ACWR — últimos 30 días
          </h2>
          <AcwrHistoryChart data={acwrHistory} />
        </div>
      ) : (
        <div className="bg-surface border border-slate-700 rounded-xl p-6 text-center text-slate-500">
          Sin datos de ACWR todavía. Registra sesiones de entrenamiento y sRPE para calcular.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wellness table */}
        <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Wellness Reciente
            </h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 text-slate-500">Fecha</th>
                <th className="text-center px-3 py-2 text-slate-500">Fatiga</th>
                <th className="text-center px-3 py-2 text-slate-500">Sueño</th>
                <th className="text-center px-3 py-2 text-slate-500">Calidad</th>
                <th className="text-center px-3 py-2 text-slate-500">Ánimo</th>
              </tr>
            </thead>
            <tbody>
              {(wellness ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-600">
                    Sin check-ins registrados
                  </td>
                </tr>
              ) : (
                (wellness ?? []).map((w) => (
                  <tr key={w.date} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-400">{formatDate(w.date)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <FatigueBar value={w.fatigue} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-300">{w.sleep_hours}h</td>
                    <td className="px-3 py-2.5 text-center text-slate-300">{"⭐".repeat(w.sleep_quality ?? 0)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {["😰", "😟", "😐", "😊", "😄"][Math.min((w.mood ?? 1) - 1, 4)]}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sessions table */}
        <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Sesiones Recientes
            </h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 text-slate-500">Fecha</th>
                <th className="text-center px-3 py-2 text-slate-500">Duración</th>
                <th className="text-center px-3 py-2 text-slate-500">RPE</th>
                <th className="text-center px-3 py-2 text-slate-500">sRPE</th>
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-600">
                    Sin sesiones registradas
                  </td>
                </tr>
              ) : (
                (sessions ?? []).map((s) => {
                  const rpe = (s.session_rpe as any[])?.[0];
                  return (
                    <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-400">{formatDate(s.date)}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{s.duration_min} min</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">
                        {rpe ? rpe.rpe : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-200">
                        {rpe ? rpe.srpe.toFixed(0) : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-surface border border-slate-700 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{unit}</p>
    </div>
  );
}

function FatigueBar({ value }: { value: number }) {
  const color =
    value <= 3 ? "#22c55e" : value <= 5 ? "#84cc16" : value <= 7 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1 justify-center">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-slate-300 w-4 text-right">{value}</span>
    </div>
  );
}
