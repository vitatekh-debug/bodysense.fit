"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prescription, PrescriptionAction, AlertLevel } from "@vitatekh/shared";
import { ALERT_LEVEL_CONFIG } from "@vitatekh/shared";
import { collapse, springPop } from "./motion/primitives";

// ─── Action Icon ──────────────────────────────────────────────────────────────

function actionIcon(type: PrescriptionAction["type"]): string {
  const icons: Record<PrescriptionAction["type"], string> = {
    exercise:  "🏋️",
    rest:      "😴",
    nutrition: "🥗",
    medical:   "🏥",
    equipment: "👟",
  };
  return icons[type] ?? "•";
}

// ─── Load Adjustment Badge ────────────────────────────────────────────────────

function LoadBadge({ pct, target, days }: {
  pct: number; target: string; days: number;
}) {
  const isStop = target === "stop";
  const color  = isStop ? "#c0492f" : pct <= -40 ? "#d9702a" : pct <= -20 ? "#d9902a" : "#6B7280";
  const label  = isStop
    ? "⛔ Parar actividad"
    : `${pct}% ${target === "volume" ? "volumen" : target === "intensity" ? "intensidad" : "carga"}`;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: color + "22" }}
    >
      {label} · {days}d
    </span>
  );
}

// ─── PrescriptionCard ─────────────────────────────────────────────────────────

interface PrescriptionCardProps {
  prescription: Prescription;
  /** Mostrar nombre del atleta (útil en dashboard multi-atleta) */
  showAthlete?: boolean;
  /** Modo compacto para listas */
  compact?: boolean;
}

export default function PrescriptionCard({
  prescription: p,
  showAthlete = false,
  compact = false,
}: PrescriptionCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const cfg = ALERT_LEVEL_CONFIG[p.alert_level];

  return (
    <motion.div
      layout
      transition={collapse}
      className="w-full rounded-xl border overflow-hidden"
      style={{ borderColor: cfg.borderColor, backgroundColor: cfg.bgColor }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:opacity-90 transition"
      >
        <span className="text-lg flex-shrink-0 mt-0.5">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            {showAthlete && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-top text-ink-body">
                {p.athlete_name}
              </span>
            )}
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: cfg.color, backgroundColor: cfg.color + "22" }}
            >
              {p.protocol_name}
            </span>
          </div>
          <p className="text-ink text-sm font-medium mt-1 leading-snug">
            {p.short_message}
          </p>
          {/* Triggered by chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {p.triggered_by.map((t) => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded border"
                style={{ color: cfg.color, borderColor: cfg.borderColor, backgroundColor: cfg.bgColor }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <motion.span
          className="text-ink-soft flex-shrink-0 mt-1"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={springPop}
        >
          ▼
        </motion.span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={collapse}
          className="overflow-hidden"
        >
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: cfg.borderColor }}>

          {/* Rationale */}
          <div className="pt-3">
            <p className="text-ink-soft text-xs font-bold uppercase tracking-wider mb-1">
              Fundamento clínico
            </p>
            <p className="text-ink-body text-xs leading-relaxed">{p.rationale}</p>
          </div>

          {/* Actions */}
          <div>
            <p className="text-ink-soft text-xs font-bold uppercase tracking-wider mb-2">
              Acciones recomendadas
            </p>
            <div className="space-y-2">
              {p.actions.map((action, i) => (
                <div
                  key={i}
                  className="bg-surface-high border border-line rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{actionIcon(action.type)}</span>
                      <span className="text-ink text-xs font-semibold">{action.label}</span>
                      {action.sets && action.reps && (
                        <span className="text-xs text-ink-soft">
                          {action.sets}×{action.reps}
                        </span>
                      )}
                      {action.duration_min && (
                        <span className="text-xs text-ink-soft">{action.duration_min} min</span>
                      )}
                    </div>
                    {action.video_url && (
                      <a
                        href={action.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                                   bg-danger/10 text-danger hover:bg-danger/15 transition border border-danger/40"
                      >
                        ▶ Ver video
                      </a>
                    )}
                  </div>
                  <p className="text-ink-soft text-xs mt-1 leading-relaxed">{action.description}</p>
                  {action.protocol && (
                    <p className="text-ink-muted text-xs mt-0.5 italic">
                      Protocolo: {action.protocol}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Load adjustment */}
          {p.load_adjustment && (
            <div>
              <p className="text-ink-soft text-xs font-bold uppercase tracking-wider mb-1.5">
                Ajuste de carga
              </p>
              <div className="flex items-start gap-2">
                <LoadBadge
                  pct={p.load_adjustment.percentage}
                  target={p.load_adjustment.target}
                  days={p.load_adjustment.duration_days}
                />
                <p className="text-ink-soft text-xs leading-relaxed">
                  {p.load_adjustment.description}
                </p>
              </div>
            </div>
          )}

          {/* Biomechanical context */}
          {p.biomech_context && (
            <div className="bg-brand/10 border border-brand/30 rounded-lg px-3 py-2">
              <p className="text-brand text-xs">
                <span className="font-bold">⚙ Contexto biomecánico: </span>
                {p.biomech_context}
              </p>
            </div>
          )}
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
