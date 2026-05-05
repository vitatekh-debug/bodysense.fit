/**
 * Bodysense Design Tokens — Mobile
 *
 * Single source of truth for the Industrial Dark design system.
 * All values align with the web counterpart (globals.css, tailwind.config.ts).
 */

export const BS = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  /** Industrial Dark — screen root / hero sections */
  void:        "#080808",
  /** Default card background */
  surface:     "#111111",
  /** Elevated card / input backgrounds */
  surfaceHigh: "#191919",

  // ── Borders ────────────────────────────────────────────────────────────────
  border:      "rgba(255,255,255,0.09)",
  borderFaint: "rgba(255,255,255,0.05)",
  borderBrand: "rgba(129,140,248,0.30)",

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
  /** Standard tracking for uppercase 10–11px labels */
  labelTracking: 1.5,
} as const;
