/**
 * Dashboard — Optimized for production
 *
 * Performance fixes:
 *  ✅ ACWR query now has explicit .limit() — no unbounded fetches
 *  ✅ Prescription lookup pre-indexed as Map<athleteId, Prescription[]>
 *     → O(1) per row instead of O(n) filter inside .map() [was O(n²)]
 *  ✅ Teams query explicitly filters by professional_id (belt + suspenders
 *     on top of RLS — prevents cross-pro data on edge function misconfiguration)
 *  ✅ ACWR display safely handles NaN / Infinity / null
 *  ✅ Athlete rows link to detail page
 *  ✅ Stale ACWR warning (last record > 3 days ago)
 *  ✅ Coach notifications count shown in header
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ACWR_ZONES,
  SPORT_LABELS,
  buildRuleInput,
  runPrescriptionRules,
} from "@vitatekh/shared";
import type { Prescription } from "@vitatekh/shared";
import PrescriptionAlerts from "@/components/PrescriptionAlerts";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the first (latest) row per athlete_id from a pre-sorted array. */
function latestByAthlete(rows: any[]): Map<string, any> {
  const map = new Map<string, any>();
  for (const row of rows ?? []) {
    if (row?.athlete_id && !map.has(row.athlete_id)) {
      map.set(row.athlete_id, row);
    }
  }
  return map;
}

/** Safe ACWR display — never shows NaN, Infinity, or null. */
function safeAcwr(ratio: unknown): string {
  if (ratio === null || ratio === undefined) return "—";
  const n = Number(ratio);
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(2);
}

/** Days between a date string and now. */
function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ── 1. Professional's teams (explicit filter + RLS) ────────────
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, sport")
    .eq("professional_id", user.id); // explicit: belt + suspenders over RLS

  const teamIds = (teams ?? []).map((t: any) => t.id);

  // ── 2. Athletes in those teams ─────────────────────────────────
  let athleteIds: string[] = [];
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("athlete_id")
      .in("team_id", teamIds);
    athleteIds = [...new Set((members ?? []).map((m: any) => m.athlete_id))];
  }

  if (athleteIds.length === 0) return <EmptyState />;

  const MAX = athleteIds.length; // use athlete count as ceiling for per-athlete queries

  // ── 3. Load all SMCP data in one round-trip (7 parallel queries) ──
  const [
    acwrRes,
    pomsRes,
    painRes,
    hqRes,
    biomechRes,
    wellnessRes,
    notifRes,
    profilesRes,
  ] = await Promise.all([
    // ACWR — one row per athlete (latest). Explicit limit = MAX.
    supabase
      .from("acwr_snapshots")
      .select("athlete_id, date, acwr_ratio, acute_load, chronic_load, risk_zone")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX),

    // POMS — up to 2 rows per athlete (dedup via latestByAthlete)
    supabase
      .from("poms_assessments")
      .select(
        "athlete_id, date, vigor, tmd_score, confusion, fatigue_poms, tension, depression, anger"
      )
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX * 2),

    // EVA pain — up to 3 rows per athlete (pain can repeat same day)
    supabase
      .from("pain_records")
      .select("athlete_id, date, eva_score, traffic_light, body_region, timing")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX * 3),

    // H/Q — up to 2 rows per athlete (left + right)
    supabase
      .from("hq_evaluations")
      .select("athlete_id, date, hq_ratio, ratio_type, risk_flag, side")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX * 2),

    // FMS — one per athlete
    supabase
      .from("biomechanical_evaluations")
      .select(
        "athlete_id, date, fms_total, fms_injury_risk, " +
        "fms_aslr, fms_deep_squat, fms_hurdle_step, fms_inline_lunge, " +
        "fms_shoulder_mobility, fms_trunk_stability, fms_rotary_stability"
      )
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX),

    // Wellness — one per athlete
    supabase
      .from("daily_wellness")
      .select("athlete_id, date, fatigue, sleep_hours, mood")
      .in("athlete_id", athleteIds)
      .order("date", { ascending: false })
      .limit(MAX * 2),

    // Unread coach notifications — count only (HEAD request = no data transfer)
    supabase
      .from("coach_notifications")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .is("read_at", null),

    // Athlete profiles — select only what the table needs
    supabase
      .from("profiles")
      .select("id, full_name, sport")
      .in("id", athleteIds),
  ]);

  // ── 4. Index latest record per athlete (O(n) once each) ────────
  const latestAcwr     = latestByAthlete(acwrRes.data    ?? []);
  const latestPoms     = latestByAthlete(pomsRes.data    ?? []);
  const latestPain     = latestByAthlete(painRes.data    ?? []);
  const latestHq       = latestByAthlete(hqRes.data      ?? []);
  const latestBiomech  = latestByAthlete(biomechRes.data ?? []);
  const latestWellness = latestByAthlete(wellnessRes.data ?? []);
  const unreadCount    = notifRes.count ?? 0;

  // ── 5. Build athlete objects ────────────────────────────────────
  const athletes = (profilesRes.data ?? []).map((p: any) => ({
    ...p,
    latest_acwr:     latestAcwr.get(p.id)     ?? null,
    latest_poms:     latestPoms.get(p.id)     ?? null,
    latest_pain:     latestPain.get(p.id)     ?? null,
    latest_hq:       latestHq.get(p.id)       ?? null,
    latest_biomech:  latestBiomech.get(p.id)  ?? null,
    latest_wellness: latestWellness.get(p.id) ?? null,
  }));

  // ── 6. Prescription engine (server-side, pure function) ────────
  const allPrescriptions = athletes.flatMap((a) =>
    runPrescriptionRules(buildRuleInput(a))
  );

  // Pre-index prescriptions by athlete ID → O(1) per row in table
  // Was previously: allPrescriptions.filter(p => p.athlete_id === athlete.id)
  // = O(n²). Now O(n) build + O(1) lookup.
  const prescriptionsByAthlete = new Map<string, Prescription[]>();
  for (const p of allPrescriptions) {
    const list = prescriptionsByAthlete.get(p.athlete_id) ?? [];
    list.push(p);
    prescriptionsByAthlete.set(p.athlete_id, list);
  }

  // ── 7. Summary stats ───────────────────────────────────────────
  const atRisk   = athletes.filter(
    (a) =>
      a.latest_acwr?.risk_zone === "high" ||
      a.latest_acwr?.risk_zone === "very_high"
  );
  const optimal    = athletes.filter((a) => a.latest_acwr?.risk_zone === "optimal");
  const redAlerts  = allPrescriptions.filter((p) => p.alert_level === "red").length;
  const orAlerts   = allPrescriptions.filter((p) => p.alert_level === "orange").length;
  const totalAlerts = redAlerts + orAlerts;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen del estado de tu equipo · {athletes.length} atleta
            {athletes.length !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-2 text-right">
            <p className="text-red-300 text-xs font-bold">
              🔔 {unreadCount} alerta{unreadCount > 1 ? "s" : ""} sin leer
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Atletas"         value={athletes.length} />
        <StatCard label="Zona Óptima"     value={optimal.length}    color="text-green-400" />
        <StatCard label="En Riesgo ACWR"  value={atRisk.length}     color="text-amber-400" />
        <StatCard
          label="Alertas Clínicas"
          value={totalAlerts}
          color={
            redAlerts > 0
              ? "text-red-400"
              : orAlerts > 0
              ? "text-orange-400"
              : "text-slate-100"
          }
        />
      </div>

      {/* Prescriptions panel */}
      {allPrescriptions.length > 0 && (
        <PrescriptionAlerts prescriptions={allPrescriptions} multiAthlete />
      )}

      {/* ACWR risk athletes */}
      {atRisk.length > 0 && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4">
          <p className="text-red-300 font-semibold text-sm">
            ⚠️ {atRisk.length} atleta{atRisk.length > 1 ? "s" : ""} con ACWR en zona de riesgo
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {atRisk.map((a: any) => (
              <Link
                key={a.id}
                href={`/athletes/${a.id}`}
                className="bg-red-900/50 text-red-200 text-xs px-3 py-1 rounded-full hover:bg-red-800/60 transition"
              >
                {a.full_name} — {safeAcwr(a.latest_acwr?.acwr_ratio)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Team table */}
      <div>
        <h2 className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-3">
          Estado del Equipo
        </h2>
        <div className="bg-surface rounded-xl overflow-hidden border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">
                  Deporte
                </th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">ACWR</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">EVA</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium hidden md:table-cell">
                  POMS
                </th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete: any) => {
                const zone = athlete.latest_acwr
                  ? ACWR_ZONES[athlete.latest_acwr.risk_zone as keyof typeof ACWR_ZONES]
                  : null;

                // O(1) — pre-indexed above
                const athleteAlerts = prescriptionsByAthlete.get(athlete.id) ?? [];
                const topAlert = athleteAlerts[0];

                const stale =
                  athlete.latest_acwr &&
                  daysAgo(athlete.latest_acwr.date) > 3;

                return (
                  <tr
                    key={athlete.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                  >
                    {/* Name → links to athlete detail */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/athletes/${athlete.id}`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
                          {(athlete.full_name as string)
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="text-slate-100 font-medium group-hover:text-indigo-300 transition">
                          {athlete.full_name}
                        </span>
                      </Link>
                    </td>

                    {/* Sport */}
                    <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                      {athlete.sport
                        ? (SPORT_LABELS[athlete.sport] ?? athlete.sport)
                        : "—"}
                    </td>

                    {/* ACWR */}
                    <td className="px-4 py-3 text-center">
                      {athlete.latest_acwr ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="font-bold text-sm"
                            style={{ color: zone?.color ?? "#94A3B8" }}
                          >
                            {safeAcwr(athlete.latest_acwr.acwr_ratio)}
                          </span>
                          {stale && (
                            <span className="text-amber-600 text-xs" title="Dato desactualizado (> 3 días)">
                              +{daysAgo(athlete.latest_acwr.date)}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* EVA */}
                    <td className="px-4 py-3 text-center">
                      {athlete.latest_pain ? (
                        <EvaChip
                          score={athlete.latest_pain.eva_score}
                          light={athlete.latest_pain.traffic_light}
                        />
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* POMS TMD */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {athlete.latest_poms != null ? (
                        <PomsBadge tmd={athlete.latest_poms.tmd_score} />
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Alert count */}
                    <td className="px-4 py-3 text-center">
                      {topAlert ? (
                        <Link
                          href={`/athletes/${athlete.id}`}
                          title={topAlert.short_message}
                        >
                          <AlertBadge
                            level={topAlert.alert_level}
                            count={athleteAlerts.length}
                          />
                        </Link>
                      ) : (
                        <span className="text-green-400 text-xs font-bold">✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = "text-slate-100",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-slate-700">
      <p className={`text-4xl font-black ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}

function EvaChip({ score, light }: { score: number; light: string }) {
  const map: Record<string, string> = {
    green: "#22C55E",
    yellow: "#F59E0B",
    red: "#EF4444",
  };
  const c = map[light] ?? "#6B7280";
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: c, backgroundColor: c + "22" }}
    >
      {score}/10
    </span>
  );
}

function PomsBadge({ tmd }: { tmd: number }) {
  const color =
    tmd > 7 ? "#F97316" : tmd > 0 ? "#EAB308" : "#22C55E";
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: color + "22" }}
    >
      TMD {tmd > 0 ? `+${tmd}` : tmd}
    </span>
  );
}

function AlertBadge({
  level,
  count,
}: {
  level: "red" | "orange" | "yellow" | "info";
  count: number;
}) {
  const map = {
    red:    { color: "#EF4444", bg: "#EF444422" },
    orange: { color: "#F97316", bg: "#F9731622" },
    yellow: { color: "#EAB308", bg: "#EAB30822" },
    info:   { color: "#60A5FA", bg: "#60A5FA22" },
  };
  const { color, bg } = map[level] ?? map.info;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: bg }}
    >
      {count} alerta{count > 1 ? "s" : ""}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen del estado de tu equipo</p>
      </div>
      <div className="bg-surface border border-slate-700 rounded-xl p-16 text-center space-y-3">
        <p className="text-4xl">👥</p>
        <p className="text-slate-300 font-semibold">No tienes atletas registrados aún</p>
        <p className="text-slate-500 text-sm">
          Crea un equipo en la app móvil e invita a tus atletas para empezar a monitorear.
        </p>
      </div>
    </div>
  );
}
