"use client";

/**
 * EvaluationCenter — Pestaña 2 del perfil.
 * Centraliza el acceso a todos los tests de Bodysense en tarjetas limpias,
 * cada una con la fecha del último registro y un CTA para registrar uno nuevo.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUpItem, springPop } from "@/components/motion/primitives";

export interface EvalCardData {
  /** Fecha ISO del último registro, o null si nunca se registró */
  lastDate: string | null;
  /** Resumen corto del último registro (ej. "WBLT 11cm · T-Test 10.2s") */
  lastSummary?: string | null;
}

interface Props {
  athleteId: string;
  ankleFoot: EvalCardData;
  fms: EvalCardData;
  load: EvalCardData;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Sin registros";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface CardConfig {
  emoji: string;
  title: string;
  subtitle: string;
  accent: string;
  href: string;
  cta: string;
  data: EvalCardData;
}

function EvalCard({ cfg }: { cfg: CardConfig }) {
  return (
    <motion.div
      variants={fadeUpItem}
      className="flex flex-col rounded-2xl border border-line bg-surface p-5 backdrop-blur-md shadow-[inset_0_1px_0_var(--bs-card-inset),0_1px_3px_var(--bs-card-shadow)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: cfg.accent + "1a", border: `1px solid ${cfg.accent}30` }}
        >
          {cfg.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="text-ink font-bold text-sm leading-tight">{cfg.title}</h3>
          <p className="text-ink-soft text-xs mt-0.5 leading-snug">{cfg.subtitle}</p>
        </div>
      </div>

      {/* Último registro */}
      <div className="mt-4 rounded-xl border border-line bg-surface-high px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
          Último registro
        </p>
        <p className="text-ink-body text-sm font-medium mt-0.5">{fmtDate(cfg.data.lastDate)}</p>
        {cfg.data.lastSummary && (
          <p className="text-ink-soft text-xs mt-1 tabular-nums">{cfg.data.lastSummary}</p>
        )}
      </div>

      {/* CTA */}
      <Link href={cfg.href} className="mt-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={springPop}
          className="w-full text-center font-bold text-sm tracking-wide py-2.5 rounded-xl transition-colors"
          style={{ backgroundColor: cfg.accent, color: "#fdf3ea" }}
        >
          {cfg.cta}
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function EvaluationCenter({ athleteId, ankleFoot, fms, load }: Props) {
  const cards: CardConfig[] = [
    {
      emoji: "🦶",
      title: "Tobillo, Pie y Rendimiento",
      subtitle: "WBLT · Feiss · Bosco · T-Test · Single-Leg Squat",
      accent: "#c65f3f",
      href: `/athletes/${athleteId}/ankle-foot`,
      cta: "Registrar Nuevo Test",
      data: ankleFoot,
    },
    {
      emoji: "🏋️‍♂️",
      title: "Evaluación Funcional FMS",
      subtitle: "7 patrones de movimiento · umbral ≤ 14",
      accent: "#3f9aa8",
      href: `/athletes/${athleteId}/fms`,
      cta: "Registrar Nuevo Test",
      data: fms,
    },
    {
      emoji: "🧠",
      title: "Historial de Carga y Antropometría",
      subtitle: "Planificación sRPE y seguimiento de carga",
      accent: "#d9902a",
      href: `/athletes/${athleteId}/plan`,
      cta: "Planificar Carga",
      data: load,
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {cards.map((cfg) => (
        <EvalCard key={cfg.title} cfg={cfg} />
      ))}
    </motion.div>
  );
}
