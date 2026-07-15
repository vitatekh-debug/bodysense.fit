"use client";

/**
 * FmsForm — Functional Movement Screen (7 patrones, 0-3 c/u).
 * Inserta en biomechanical_evaluations. fms_total y fms_injury_risk
 * son columnas GENERATED — se omiten. surface_type y footwear_type
 * son NOT NULL en la tabla.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FMS_PATTERNS, FMS_SCORE_LABELS } from "@vitatekh/shared";
import { springPop } from "@/components/motion/primitives";
import { useThemeColors } from "@/components/theme/useThemeColors";

const SURFACE_OPTIONS: { value: string; label: string }[] = [
  { value: "natural_grass", label: "Césped natural" },
  { value: "artificial_grass_3g", label: "Césped 3G" },
  { value: "hard_court", label: "Pista dura" },
  { value: "parquet", label: "Parqué" },
  { value: "gym_floor", label: "Gimnasio" },
  { value: "other", label: "Otra" },
];

const FOOTWEAR_OPTIONS: { value: string; label: string }[] = [
  { value: "basketball", label: "Baloncesto" },
  { value: "volleyball", label: "Voleibol" },
  { value: "cleats_fg", label: "Tacos FG" },
  { value: "running", label: "Running" },
  { value: "training", label: "Training" },
  { value: "other", label: "Otro" },
];

export default function FmsForm({
  athleteId,
  professionalId,
}: {
  athleteId: string;
  professionalId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const c = useThemeColors();

  // Escala FMS 0-3: dolor → correcto. Sigue el tema activo.
  const SCORE_COLOR = [c.danger, c.warning, c.success, c.success];

  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(FMS_PATTERNS.map((p) => [p.key, null]))
  );
  const [surface, setSurface] = useState("");
  const [footwear, setFootwear] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = FMS_PATTERNS.reduce((sum, p) => sum + (scores[p.key] ?? 0), 0);
  const scored = FMS_PATTERNS.filter((p) => scores[p.key] != null).length;
  const totalColor = total <= 14 ? c.warning : c.success;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!surface || !footwear) {
      setError("Selecciona superficie y calzado (requeridos).");
      return;
    }
    setSubmitting(true);

    const today = new Date().toISOString().split("T")[0];
    const { error: insertError } = await supabase
      .from("biomechanical_evaluations")
      .insert({
        athlete_id: athleteId,
        evaluated_by: professionalId,
        date: today,
        surface_type: surface,
        footwear_type: footwear,
        ...Object.fromEntries(FMS_PATTERNS.map((p) => [p.key, scores[p.key]])),
        findings: notes || null,
      });

    setSubmitting(false);
    if (insertError) {
      setError(`No se pudo guardar: ${insertError.message}`);
      return;
    }
    router.push(`/athletes/${athleteId}?tab=evolucion`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Total en vivo */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
            FMS Total
          </p>
          <p className="text-xs text-ink-soft mt-0.5">{scored}/7 patrones evaluados</p>
        </div>
        <motion.span
          key={total}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={springPop}
          className="text-4xl font-black tabular-nums inline-block"
          style={{ color: totalColor }}
        >
          {total}
          <span className="text-lg text-ink-muted">/21</span>
        </motion.span>
      </div>

      {/* Patrones */}
      <div className="space-y-3 mb-6">
        {FMS_PATTERNS.map((pattern) => (
          <div
            key={pattern.key}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <p className="text-sm font-semibold text-ink mb-2.5">{pattern.label}</p>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((score) => {
                const active = scores[pattern.key] === score;
                return (
                  <motion.button
                    key={score}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [pattern.key]: score }))}
                    animate={{ scale: active ? 1.03 : 1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springPop}
                    className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors duration-200"
                    style={{
                      borderColor: active ? SCORE_COLOR[score] : c.line,
                      backgroundColor: active ? SCORE_COLOR[score]! + "22" : c.surfaceHigh,
                      color: active ? SCORE_COLOR[score] : c.inkSoft,
                    }}
                  >
                    <span className="block text-base font-black">{score}</span>
                    <span className="block text-[9px] leading-tight mt-0.5">
                      {FMS_SCORE_LABELS[score]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contexto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase mb-2">
            Superficie
          </p>
          <div className="flex flex-wrap gap-2">
            {SURFACE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setSurface(surface === o.value ? "" : o.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  surface === o.value
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-line bg-surface-high text-ink-soft hover:border-line-strong"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase mb-2">
            Calzado
          </p>
          <div className="flex flex-wrap gap-2">
            {FOOTWEAR_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFootwear(footwear === o.value ? "" : o.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  footwear === o.value
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-line bg-surface-high text-ink-soft hover:border-line-strong"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Observaciones (opcional)…"
        className="w-full bg-surface-high border border-line rounded-lg px-3 py-2.5 text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-brand mb-4"
      />

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand hover:bg-brand active:bg-brand-dark disabled:opacity-50 text-ink font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors"
      >
        {submitting ? "Guardando…" : "Guardar Evaluación FMS"}
      </button>
    </form>
  );
}
