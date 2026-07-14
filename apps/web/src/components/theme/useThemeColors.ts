"use client";

/**
 * useThemeColors — colores del tema activo, en JS.
 *
 * Necesario porque Recharts pinta atributos SVG (fill/stroke) y los
 * atributos de presentación NO resuelven var(--x). Este hook lee los
 * canales del <html> y los devuelve como hex, re-leyéndolos cuando el
 * atributo data-theme cambia.
 */

import { useEffect, useState } from "react";

export interface ThemeColors {
  void: string;
  surface: string;
  surfaceHigh: string;
  line: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  brand: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
}

const TOKENS: Record<keyof ThemeColors, string> = {
  void:        "--bs-void",
  surface:     "--bs-surface",
  surfaceHigh: "--bs-surface-high",
  line:        "--bs-line",
  ink:         "--bs-ink",
  inkSoft:     "--bs-ink-soft",
  inkMuted:    "--bs-ink-muted",
  brand:       "--bs-brand",
  success:     "--bs-success",
  danger:      "--bs-danger",
  warning:     "--bs-warning",
  info:        "--bs-info",
};

/** "241 230 212" → "#f1e6d4" */
function channelsToHex(raw: string): string {
  const parts = raw.trim().split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some((n) => isNaN(n))) return "#000000";
  return (
    "#" +
    parts
      .slice(0, 3)
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Paleta de respaldo (SSR / primer render, antes de leer el DOM). */
const FALLBACK: ThemeColors = {
  void: "#f1e6d4", surface: "#fdf9f2", surfaceHigh: "#f7efe2", line: "#e4d8c4",
  ink: "#3a2c1e", inkSoft: "#8a7660", inkMuted: "#b0a08c", brand: "#c65f3f",
  success: "#6f9c4a", danger: "#c0492f", warning: "#d9902a", info: "#4a86b0",
};

function read(): ThemeColors {
  if (typeof window === "undefined") return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const out = {} as ThemeColors;
  (Object.keys(TOKENS) as (keyof ThemeColors)[]).forEach((key) => {
    const raw = cs.getPropertyValue(TOKENS[key]);
    out[key] = raw ? channelsToHex(raw) : FALLBACK[key];
  });
  return out;
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    setColors(read());

    // Re-leer cuando el toggle cambia data-theme en <html>
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
