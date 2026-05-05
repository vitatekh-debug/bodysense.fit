import Link from "next/link";
import { ArrowLeft, Pencil, CalendarDays } from "lucide-react";
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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline ACWR zone pill shown in the header — high visual impact, low footprint. */
function AcwrZonePill({ acwr }: { acwr: AcwrSummary }) {
  const zone = ACWR_ZONES[acwr.risk_zone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide"
      style={{
        color: zone.color,
        borderColor: zone.color + "40",
        backgroundColor: zone.color + "14",
      }}
    >
      {/* Pulsing dot for high-risk zones */}
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          (acwr.risk_zone === "high" || acwr.risk_zone === "very_high") &&
            "animate-pulse"
        )}
        style={{ backgroundColor: zone.color }}
      />
      {acwr.acwr_ratio.toFixed(2)}&nbsp;·&nbsp;{zone.label}
    </span>
  );
}

/** Avatar circle with neon-indigo ring and initials. */
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
        "flex h-20 w-20 shrink-0 items-center justify-center",
        "rounded-2xl bg-[#818cf8]/10 text-2xl font-black text-[#818cf8]",
        "ring-2 ring-[#818cf8]/25 ring-offset-2 ring-offset-[#080808]",
        "select-none"
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
    <div className="auth-grid-bg relative -mx-6 -mt-6 mb-8 overflow-hidden bg-[#080808] px-6 pb-10 pt-6">
      {/* Gradient bleed into dashboard surface */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#0F172A]" />

      {/* Back link */}
      <Link
        href="/athletes"
        className="relative mb-6 inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-slate-200"
      >
        <ArrowLeft size={14} />
        Volver a atletas
      </Link>

      {/* Main header row */}
      <div className="relative flex flex-wrap items-center gap-5 sm:flex-nowrap">
        <AthleteAvatar name={profile.full_name} />

        {/* Identity block */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Name */}
          <h1 className="truncate text-3xl font-black tracking-tight text-white">
            {profile.full_name}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {sport && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {sport}
              </span>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {profile.email}
            </span>
            {/* ACWR inline indicator */}
            {latestAcwr && <AcwrZonePill acwr={latestAcwr} />}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {/* Plan sessions */}
          <Link
            href={`/athletes/${athleteId}/plan`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[#818cf8]/50",
              "bg-[#818cf8]/12 px-4 py-2 text-[13px] font-semibold text-[#818cf8]",
              "transition-colors hover:border-[#818cf8]/80 hover:bg-[#818cf8]/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40"
            )}
          >
            <CalendarDays size={13} />
            Planificar
          </Link>

          {/* Edit profile — indigo outline style per design spec */}
          <Link
            href={`/athletes/${athleteId}/edit`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[#818cf8]/30",
              "bg-[#818cf8]/8 px-4 py-2 text-[13px] font-semibold text-[#818cf8]",
              "transition-colors hover:border-[#818cf8]/60 hover:bg-[#818cf8]/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40"
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
