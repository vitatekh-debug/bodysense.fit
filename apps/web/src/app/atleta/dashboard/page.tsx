/**
 * /atleta/dashboard — Vista de atleta (Server Component)
 *
 * Fetches:
 *  1. Perfil del usuario actual (nombre, deporte)
 *  2. Primer equipo al que pertenece (para vincular la training_session)
 *  3. Últimas 5 sesiones (para mostrar historial rápido)
 *  4. Último resultado H/Q
 *
 * Pasa los datos al Client Component AthleteQuickLog.
 */

import { redirect }         from "next/navigation";
import { createClient }     from "@/lib/supabase/server";
import AthleteQuickLog      from "./AthleteQuickLog";
import { SPORT_LABELS }     from "@vitatekh/shared";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function AthleteDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── 1. Perfil ─────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, sport, role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.email || "Atleta";
  const sport       = profile?.sport;

  // ── 2. Equipo del atleta (primer resultado) ───────────────────────────────
  const { data: memberRows } = await supabase
    .from("team_members")
    .select("team_id, teams(name)")
    .eq("athlete_id", user.id)
    .limit(1);

  const firstTeam  = memberRows?.[0] ?? null;
  const teamId     = firstTeam?.team_id ?? null;
  const teamName   = (firstTeam?.teams as any)?.name ?? null;

  // ── 3. Últimas 5 sesiones ─────────────────────────────────────────────────
  const { data: recentSessions } = await supabase
    .from("training_sessions")
    .select("id, date, duration_min, session_type, session_rpe(rpe, srpe)")
    .eq("athlete_id", user.id)
    .order("date", { ascending: false })
    .limit(5);

  // ── 4. Último H/Q ─────────────────────────────────────────────────────────
  const { data: latestHq } = await supabase
    .from("hq_evaluations")
    .select("date, hq_ratio, ratio_type, side, risk_flag")
    .eq("athlete_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Info de contexto (equipo / deporte) */}
      {(teamName || sport) && (
        <div className="flex flex-wrap gap-2">
          {teamName && (
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-800/50 text-indigo-300">
              🏅 {teamName}
            </span>
          )}
          {sport && (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {SPORT_LABELS[sport as keyof typeof SPORT_LABELS] ?? sport}
            </span>
          )}
          {!teamName && (
            <span className="text-xs px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-400">
              ⚠ Sin equipo asignado — pide a tu entrenador que te vincule
            </span>
          )}
        </div>
      )}

      {/* ── Quick Log (Client Component) ── */}
      <AthleteQuickLog
        userId={user.id}
        userName={displayName}
        teamId={teamId}
      />

      {/* ── Historial de sesiones recientes ── */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="bg-[#111] border border-slate-700 rounded-2xl p-5 space-y-3">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Últimas sesiones
          </h2>
          <div className="space-y-2">
            {recentSessions.map((s: any) => {
              const rpe = s.session_rpe?.[0];
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                >
                  <div>
                    <p className="text-slate-200 text-sm font-medium">
                      {new Date(s.date).toLocaleDateString("es-CO", {
                        day: "2-digit", month: "short",
                      })}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {s.duration_min} min · {s.session_type}
                    </p>
                  </div>
                  {rpe && (
                    <div className="text-right">
                      <p className="text-indigo-300 text-sm font-bold">
                        {rpe.srpe} UA
                      </p>
                      <p className="text-slate-600 text-xs">sRPE</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Último H/Q ── */}
      {latestHq && (
        <div className="bg-[#111] border border-slate-700 rounded-2xl p-5">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            Último test H/Q
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs">
                {new Date(latestHq.date).toLocaleDateString("es-CO", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
                {" · "}
                {latestHq.ratio_type === "conventional" ? "Convencional" : "Funcional"}
                {" · "}
                {latestHq.side}
              </p>
            </div>
            <span
              className="text-lg font-black"
              style={{ color: latestHq.risk_flag ? "#EF4444" : "#22C55E" }}
            >
              {Number(latestHq.hq_ratio).toFixed(3)}
              {latestHq.risk_flag ? " ⚠" : " ✓"}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
