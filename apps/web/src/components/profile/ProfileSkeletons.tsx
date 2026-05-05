/**
 * ProfileSkeletons — Bodysense
 *
 * Shimmer skeleton components used as Suspense fallbacks throughout the
 * athlete profile page. Each skeleton mirrors the exact dimensions of its
 * real counterpart so the layout doesn't jump when content streams in.
 */

import React from "react";
import { cn } from "@/lib/utils";

// ─── Primitive ─────────────────────────────────────────────────────────────

function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bs-skeleton bg-white/[0.04]",
        className
      )}
      style={style}
      aria-hidden
    />
  );
}

// ─── Header skeleton ────────────────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <div className="auth-grid-bg relative -mx-6 -mt-6 mb-8 overflow-hidden bg-[#080808] px-6 pb-10 pt-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#0F172A]" />

      {/* Back link placeholder */}
      <Bone className="mb-6 h-4 w-24" />

      <div className="relative flex items-center gap-5">
        {/* Avatar */}
        <Bone className="h-20 w-20 rounded-2xl shrink-0" />

        {/* Identity block */}
        <div className="flex flex-1 flex-col gap-3">
          <Bone className="h-8 w-48" />
          <div className="flex items-center gap-3">
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-20" />
            <Bone className="h-6 w-28 rounded-full" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Metric cards skeleton ──────────────────────────────────────────────────

export function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* ACWR Hero (double-wide on small) */}
      <div
        className={cn(
          "col-span-2 sm:col-span-1",
          "rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 backdrop-blur-md",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        )}
      >
        <Bone className="mb-3 h-2.5 w-10" />
        <Bone className="mb-3 h-12 w-20" />
        <Bone className="mb-4 h-6 w-24 rounded-full" />
        <div className="flex gap-0.5">
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-1 flex-1 rounded-full" />
          ))}
        </div>
      </div>

      {/* 3 generic metric cards */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 backdrop-blur-md",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          )}
        >
          <Bone className="mb-3 h-2.5 w-24" />
          <Bone className="mb-2 h-8 w-16" />
          <Bone className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── ACWR chart skeleton ─────────────────────────────────────────────────────

export function AcwrChartSkeleton() {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
      )}
    >
      {/* Y-axis + chart area */}
      <div className="flex gap-4">
        <div className="flex flex-col justify-between py-2">
          {[...Array(5)].map((_, i) => (
            <Bone key={i} className="h-2 w-6" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {/* Fake chart lines at different heights */}
          <div className="relative h-[200px] w-full">
            {[20, 40, 55, 65, 80].map((h, i) => (
              <Bone
                key={i}
                className="absolute h-px w-full opacity-40"
                style={{ top: `${h}%` } as React.CSSProperties}
              />
            ))}
            <Bone className="absolute inset-0 rounded-lg opacity-30" />
          </div>
          {/* X-axis */}
          <div className="flex justify-between">
            {[...Array(6)].map((_, i) => (
              <Bone key={i} className="h-2 w-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table skeleton (shared by Wellness + Sessions) ──────────────────────────

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.09] bg-white/[0.025] overflow-hidden backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <Bone className="h-2.5 w-32" />
        <Bone className="h-2.5 w-16" />
      </div>

      {/* Column headers */}
      <div className="flex gap-6 border-b border-white/[0.05] px-4 py-2.5">
        {[...Array(5)].map((_, i) => (
          <Bone key={i} className="h-2 w-12 flex-1" />
        ))}
      </div>

      {/* Data rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex gap-6 border-b border-white/[0.04] px-4 py-3"
        >
          <Bone className="h-3 w-16 flex-1" />
          <Bone className="h-3 w-20 flex-1" />
          <Bone className="h-3 w-12 flex-1" />
          <Bone className="h-3 w-12 flex-1" />
          <Bone className="h-3 w-8 flex-1" />
        </div>
      ))}
    </div>
  );
}

// ─── Full-page skeleton (used by loading.tsx) ────────────────────────────────

export function AthleteProfilePageSkeleton() {
  return (
    <div className="max-w-5xl space-y-8">
      <ProfileHeaderSkeleton />
      <MetricCardsSkeleton />
      <AcwrChartSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableSkeleton rows={7} />
        <TableSkeleton rows={7} />
      </div>
    </div>
  );
}
