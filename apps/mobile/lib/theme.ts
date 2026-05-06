/**
 * Bodysense Design Tokens — Mobile
 *
 * Single source of truth for the Industrial Dark design system.
 * All values align with the web counterpart (globals.css, tailwind.config.ts).
 *
 * Changelog:
 *   v2 — labelTracking 1.5 → 1.8 for more premium "Technical Spec" feel.
 *        Added labelTrackingHero (2.2) and zone glow constants.
 */

import type { AcwrRiskZone } from "@vitatekh/shared";

export const BS = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  /** Industrial Dark — screen root / hero sections */
  void:        "#080808",
  /** Default card background — minimal glass opacity over void */
  surface:     "rgba(255,255,255,0.028)",
  /** Original opaque surface (kept for overlays that need full opacity) */
  surfaceOpaque: "#111111",
  /** Elevated card / input backgrounds */
  surfaceHigh: "#191919",

  // ── Borders ────────────────────────────────────────────────────────────────
  border:           "rgba(255,255,255,0.07)",
  /** Brighter top-edge border — simulates gradient border highlight */
  borderTop:        "rgba(255,255,255,0.13)",
  borderFaint:      "rgba(255,255,255,0.05)",
  borderBrand:      "rgba(129,140,248,0.30)",

  // ── Brand ──────────────────────────────────────────────────────────────────
  /** Primary indigo — form backgrounds, active states */
  brand:      "#6366F1",
  /** Neon indigo — buttons, labels, glows */
  brandLight: "#818CF8",
  /** Pressed / active state */
  brandDark:  "#4F46E5",

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary:   "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted:     "#475569",
  textDisabled:  "#334155",

  // ── Semantic ───────────────────────────────────────────────────────────────
  success: "#22C55E",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#38BDF8",

  // ── Spacing ────────────────────────────────────────────────────────────────
  pagePad:    20,
  cardPad:    18,
  cardRadius: 16,
  gap:        12,

  // ── Typography helpers ─────────────────────────────────────────────────────
  /** Standard tracking for uppercase 10–11px labels (Technical Spec style) */
  labelTracking:     1.8,
  /** Hero tracking for large badges / section titles */
  labelTrackingHero: 2.2,
} as const;

// ── ACWR Zone Glow specs ──────────────────────────────────────────────────────
// Governs shadow intensity for zone-coloured iOS glow + Android elevation.
// Intensity escalates with risk level.

export interface ZoneGlowSpec {
  opacity:   number;
  radius:    number;
  elevation: number;
}

export const ZONE_GLOW: Record<AcwrRiskZone, ZoneGlowSpec> = {
  low:       { opacity: 0.28, radius:  7, elevation: 3 },
  optimal:   { opacity: 0.32, radius:  9, elevation: 4 },
  high:      { opacity: 0.45, radius: 13, elevation: 6 },
  very_high: { opacity: 0.55, radius: 18, elevation: 9 },
};

// ── Brand glow (for CTA buttons, avatar rings) ────────────────────────────────
export const BRAND_GLOW = {
  opacity:   0.40,
  radius:    16,
  elevation: 8,
} as const;
