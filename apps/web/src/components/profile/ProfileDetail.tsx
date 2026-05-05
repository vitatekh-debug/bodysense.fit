/**
 * ProfileDetail — Bodysense
 *
 * Server Component orchestrator. Renders the athlete profile shell immediately,
 * then streams each heavy data section independently via React Suspense.
 *
 * Streaming waterfall (approximate):
 *   0ms   — ProfileHeader (profile + latestAcwr already in props)
 *   async — MetricsSection   (1 ACWR row + session count)
 *   async — AcwrChartSection (30-day ACWR history)
 *   async — WellnessSection  (7 wellness rows)
 *   async — SessionsSection  (10 training sessions)
 *
 * Each async section is independent; they resolve in parallel thanks to
 * React's concurrent Suspense model.
 */

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { Profile, AcwrRiskZone, SessionType, SessionPhase } from "@vitatekh/shared";

import ProfileHeader from "./ProfileHeader";
import ProfileMetricCards from "./ProfileMetricCards";
import ProfileWellnessTable from "./ProfileWellnessTable";
import ProfileSessionsTable from "./ProfileSessionsTable";
import AcwrHistoryChart from "@/app/(dashboard)/athletes/[id]/AcwrHistoryChart";
import {
  MetricCardsSkeleton,
  AcwrChartSkeleton,
  TableSkeleton,
} from "./ProfileSkeletons";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface AcwrSummary {
  date: string;
  acwr_ratio: number;
  acute_load: number;
  chronic_load: number;
  risk_zone: AcwrRiskZone;
}

export interface ProfileDetailProps {
  profile: Profile;
  athleteId: string;
  latestAcwr: AcwrSummary | null;
}

// ─── Async Section: MetricsSection ───────────────────────────────────────────

async function MetricsSection({ athleteId, latestAcwr }: {
  athleteId: string;
  latestAcwr: AcwrSummary | null;
}) {
  const supabase = createClient();

  // Session count for the "Sesiones recientes" metric card
  const { count } = await supabase
    .from("training_sessions")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", athleteId);

  return (
    <ProfileMetricCards
      latestAcwr={latestAcwr}
      sessionCount={count ?? 0}
    />
  );
}

// ─── Async Section: AcwrChartSection ─────────────────────────────────────────

async function AcwrChartSection({ athleteId }: { athleteId: string }) {
  const supabase = createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("acwr_snapshots")
    .select("date, acwr_ratio, acute_load, chronic_load, risk_zone")
    .eq("athlete_id", athleteId)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0]!)
    .order("date", { ascending: true });

  if (!data || data.length === 0) {
    return (
      <EmptyState message="Sin datos de ACWR todavía. Registra sesiones de entrenamiento y sRPE para calcular." />
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_3px_rgba(0,0,0,0.4)]",
        "bs-fade-up bs-d2",
      ].join(" ")}
    >
      <AcwrHistoryChart data={data} />
    </div>
  );
}

// ─── Async Section: WellnessSection ──────────────────────────────────────────

async function WellnessSection({ athleteId }: { athleteId: string }) {
  const supabase = createClient();

  const { data } = await supabase
    .from("daily_wellness")
    .select("date, fatigue, sleep_hours, sleep_quality, mood")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(7);

  return <ProfileWellnessTable rows={data ?? []} />;
}

// ─── Async Section: SessionsSection ──────────────────────────────────────────

async function SessionsSection({ athleteId }: { athleteId: string }) {
  const supabase = createClient();

  const { data } = await supabase
    .from("training_sessions")
    .select(`id, date, duration_min, session_type, phase, session_rpe (rpe, srpe)`)
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(10);

  return (
    <ProfileSessionsTable
      rows={(data ?? []) as Parameters<typeof ProfileSessionsTable>[0]["rows"]}
    />
  );
}

// ─── Shared presentational helpers ───────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-2xl p-10 text-center",
        "border border-white/[0.09] bg-white/[0.025] backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      ].join(" ")}
    >
      <p className="max-w-sm text-[13px] leading-relaxed text-white/25">{message}</p>
    </div>
  );
}

function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={[
        "mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </h2>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileDetail({
  profile,
  athleteId,
  latestAcwr,
}: ProfileDetailProps) {
  return (
    <div className="max-w-5xl space-y-8">
      {/* ── 1. Hero header — renders synchronously (data already in props) ── */}
      <div className="bs-fade-up bs-d0">
        <ProfileHeader
          profile={profile}
          athleteId={athleteId}
          latestAcwr={latestAcwr}
        />
      </div>

      {/* ── 2. Bento metric cards ────────────────────────────────────────── */}
      <section aria-label="Métricas de carga" className="bs-fade-up bs-d1">
        <Suspense fallback={<MetricCardsSkeleton />}>
          <MetricsSection athleteId={athleteId} latestAcwr={latestAcwr} />
        </Suspense>
      </section>

      {/* ── 3. ACWR history chart ─────────────────────────────────────────── */}
      <section aria-label="Evolución ACWR" className="bs-fade-up bs-d2">
        <SectionHeading>Evolución ACWR — últimos 30 días</SectionHeading>
        <Suspense fallback={<AcwrChartSkeleton />}>
          <AcwrChartSection athleteId={athleteId} />
        </Suspense>
      </section>

      {/* ── 4. Wellness + Sessions ──────────────────────────────────────────*/}
      <section
        aria-label="Wellness y sesiones recientes"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="bs-fade-up bs-d3">
          <SectionHeading>Wellness reciente</SectionHeading>
          <Suspense fallback={<TableSkeleton rows={7} />}>
            <WellnessSection athleteId={athleteId} />
          </Suspense>
        </div>
        <div className="bs-fade-up bs-d4">
          <SectionHeading>Sesiones recientes</SectionHeading>
          <Suspense fallback={<TableSkeleton rows={7} />}>
            <SessionsSection athleteId={athleteId} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
