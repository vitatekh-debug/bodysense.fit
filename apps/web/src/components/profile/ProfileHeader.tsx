/**
 * ProfileHeader — Bodysense
 *
 * Hero section for the athlete profile page.
 * Design: Industrial Dark cover (#f1e6d4 + dot-grid), avatar with neon-indigo
 * ring, uppercase 10 px labels, ACWR zone pill with zone-coloured glow.
 */

import Link from "next/link";
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import { ACWR_ZONES, SPORT_LABELS } from "@vitatekh/shared";
import type { AcwrRiskZone, Profile, Sport } from "@vitatekh/shared";
import { cn } from "@/lib/utils";
import RecalculateButton from "@/app/(dashboard)/athletes/[id]/RecalculateButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcwrSummary {
  acwr_ratio: number;
  risk_zone: AcwrRiskZone;
}

interface ProfileHeaderProps {
  profile: Profile;
  athleteId: string;
  latestAcwr: AcwrSummary | null;
}

// ─── ACWR glow helper ─────────────────────────────────────────────────────────

function zoneGlow(zone: AcwrRiskZone): string {
  const glowMap: Record<AcwrRiskZone, string> = {
    low:       "0 0 10px rgba(59,  130, 246, 0.45), 0 0 28px rgba(59,  130, 246, 0.14)",
    optimal:   "0 0 10px rgba(34,  197,  94, 0.50), 0 0 28px rgba(34,  197,  94, 0.16)",
    high:      "0 0 10px rgba(245, 158,  11, 0.55), 0 0 28px rgba(245, 158,  11, 0.18)",
    very_high: "0 0 12px rgba(239,  68,  68, 0.60), 0 0 32px rgba(239,  68,  68, 0.20)",
  };
  return glowMap[zone];
}

// ─── ACWR Zone Pill ───────────────────────────────────────────────────────────

function AcwrZonePill({ acwr }: { acwr: AcwrSummary }) {
  const zone     = ACWR_ZONES[acwr.risk_zone];
  const isPulsing = acwr.risk_zone === "high" || acwr.risk_zone === "very_high";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.06em]"
      style={{
        color:           zone.color,
        borderColor:     zone.color + "35",
        backgroundColor: zone.color + "12",
        border:          `1px solid ${zone.color}35`,
        boxShadow:       zoneGlow(acwr.risk_zone),
      }}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          isPulsing && "animate-pulse"
        )}
        style={{ backgroundColor: zone.color }}
      />
      {acwr.acwr_ratio.toFixed(2)}&nbsp;·&nbsp;{zone.label}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AthleteAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex h-20 w-20 shrink-0 items-center justify-center select-none",
        "rounded-2xl bg-[#c65f3f]/10 text-2xl font-black text-[#c65f3f]",
        "ring-2 ring-[#c65f3f]/25 ring-offset-2 ring-offset-[#f1e6d4]",
        // Soft neon glow on the avatar ring
        "shadow-[0_0_18px_rgba(198,95,63,0.22),0_0_48px_rgba(198,95,63,0.08)]"
      )}
      aria-label={`Avatar de ${name}`}
    >
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileHeader({
  profile,
  athleteId,
  latestAcwr,
}: ProfileHeaderProps) {
  const sport = profile.sport
    ? (SPORT_LABELS[profile.sport as Sport] ?? profile.sport)
    : null;

  return (
    <div className="auth-grid-bg relative -mx-6 -mt-6 mb-8 overflow-hidden bg-[#f1e6d4] px-6 pb-10 pt-6">
      {/* Gradient bleed into dashboard surface */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#f1e6d4]" />

      {/* Back link */}
      <Link
        href="/athletes"
        className="relative mb-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8a7660] transition-colors hover:text-[#5d4c3a]"
      >
        <ArrowLeft size={13} />
        Volver a atletas
      </Link>

      {/* Main header row */}
      <div className="relative flex flex-wrap items-center gap-5 sm:flex-nowrap">
        <AthleteAvatar name={profile.full_name} />

        {/* Identity block */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {/* Name */}
          <h1 className="truncate text-3xl font-black tracking-tight text-[#3a2c1e]">
            {profile.full_name}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {sport && (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7660]">
                {sport}
              </span>
            )}
            {sport && (
              <span className="text-[#b0a08c] text-[10px]">·</span>
            )}
            <span className="text-[11px] font-medium text-[#8a7660]">
              {profile.email}
            </span>

            {/* ACWR inline zone pill with glow */}
            {latestAcwr && <AcwrZonePill acwr={latestAcwr} />}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {/* Plan sessions */}
          <Link
            href={`/athletes/${athleteId}/plan`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2",
              "border border-[#c65f3f]/50 bg-[#c65f3f]/12",
              "text-[13px] font-semibold text-[#c65f3f]",
              "transition-all duration-200",
              "hover:border-[#c65f3f]/80 hover:bg-[#c65f3f]/20",
              "hover:shadow-[0_0_14px_rgba(198,95,63,0.25)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65f3f]/40"
            )}
          >
            <CalendarDays size={13} />
            Planificar
          </Link>

          {/* Ankle / foot / functional assessment */}
          <Link
            href={`/athletes/${athleteId}/ankle-foot`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2",
              "border border-[#c65f3f]/30 bg-[#c65f3f]/8",
              "text-[13px] font-semibold text-[#c65f3f]",
              "transition-all duration-200",
              "hover:border-[#c65f3f]/60 hover:bg-[#c65f3f]/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65f3f]/40"
            )}
          >
            🦶 Tobillo/Pie
          </Link>

          {/* Edit profile */}
          <Link
            href={`/athletes/${athleteId}/edit`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2",
              "border border-[#c65f3f]/30 bg-[#c65f3f]/8",
              "text-[13px] font-semibold text-[#c65f3f]",
              "transition-all duration-200",
              "hover:border-[#c65f3f]/60 hover:bg-[#c65f3f]/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65f3f]/40"
            )}
          >
            <Pencil size={13} />
            Editar Perfil
          </Link>

          <RecalculateButton athleteId={athleteId} />
        </div>
      </div>
    </div>
  );
}
