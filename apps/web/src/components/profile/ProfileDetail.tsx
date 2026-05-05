/**
 * ProfileDetail — Bodysense
 *
 * Server component. Orchestrates the full athlete profile view:
 *   ProfileHeader        — dark cover with avatar, ACWR zone pill, edit button
 *   ProfileMetricCards   — 4-card bento grid (ACWR hero, acute, chronic, sessions)
 *   AcwrHistoryChart     — recharts area chart (client component, existing)
 *   ProfileWellnessTable — last 7 wellness check-ins
 *   ProfileSessionsTable — last 10 sessions with RPE/sRPE
 *
 * All data is received as props from the parent page.tsx — no fetching here.
 */

import { ACWR_ZONES } from "@vitatekh/shared";
import type {
  Profile,
  AcwrRiskZone,
  SessionType,
  SessionPhase,
  DailyWellness,
} from "@vitatekh/shared";

import ProfileHeader from "./ProfileHeader";
import ProfileMetricCards from "./ProfileMetricCards";
import ProfileWellnessTable from "./ProfileWellnessTable";
import ProfileSessionsTable from "./ProfileSessionsTable";
import AcwrHistoryChart from "@/app/(dashboard)/athletes/[id]/AcwrHistoryChart";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Partial AcwrSnapshot — only the columns the page query selects. */
export interface AcwrHistoryRow {
  date: string;
  acwr_ratio: number;
  acute_load: number;
  chronic_load: number;
  risk_zone: AcwrRiskZone;
}

/** Partial DailyWellness — only the columns the page query selects. */
export type WellnessRow = Pick<
  DailyWellness,
  "date" | "fatigue" | "sleep_hours" | "sleep_quality" | "mood"
>;

/** Partial TrainingSession with joined SessionRpe. */
export interface SessionRow {
  id: string;
  date: string;
  duration_min: number;
  session_type: SessionType;
  phase: SessionPhase;
  session_rpe: { rpe: number; srpe: number }[] | unknown;
}

export interface ProfileDetailProps {
  profile: Profile;
  athleteId: string;
  acwrHistory: AcwrHistoryRow[];
  wellness: WellnessRow[];
  sessions: SessionRow[];
}

// ─── Empty-state card ─────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.025] p-10 text-center">
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
      {children}
    </h2>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileDetail({
  profile,
  athleteId,
  acwrHistory,
  wellness,
  sessions,
}: ProfileDetailProps) {
  const latestAcwr = acwrHistory.at(-1) ?? null;

  return (
    <div className="max-w-5xl space-y-8">
      {/* ── 1. Hero header ── */}
      <ProfileHeader
        profile={profile}
        athleteId={athleteId}
        latestAcwr={latestAcwr}
      />

      {/* ── 2. Bento metric cards ── */}
      <section aria-label="Métricas de carga">
        <ProfileMetricCards
          latestAcwr={latestAcwr}
          sessionCount={sessions.length}
        />
      </section>

      {/* ── 3. ACWR chart ── */}
      <section aria-label="Evolución ACWR">
        <SectionHeading>Evolución ACWR — últimos 30 días</SectionHeading>
        {acwrHistory.length > 0 ? (
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-sm">
            <AcwrHistoryChart data={acwrHistory} />
          </div>
        ) : (
          <EmptyState message="Sin datos de ACWR todavía. Registra sesiones de entrenamiento y sRPE para calcular." />
        )}
      </section>

      {/* ── 4. Wellness + Sessions (2-col on large screens) ── */}
      <section
        aria-label="Wellness y sesiones recientes"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div>
          <SectionHeading>Wellness reciente</SectionHeading>
          <ProfileWellnessTable rows={wellness} />
        </div>
        <div>
          <SectionHeading>Sesiones recientes</SectionHeading>
          <ProfileSessionsTable rows={sessions as SessionRow[]} />
        </div>
      </section>
    </div>
  );
}
