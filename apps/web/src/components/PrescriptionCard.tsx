"use client";

import { useState } from "react";
import type { Prescription, PrescriptionAction, AlertLevel } from "@vitatekh/shared";
import { ALERT_LEVEL_CONFIG } from "@vitatekh/shared";

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
  const color  = isStop ? "#EF4444" : pct <= -40 ? "#F97316" : pct <= -20 ? "#EAB308" : "#6B7280";
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
    <div
      className="rounded-xl border overflow-hidden transition-all"
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
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
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
          <p className="text-slate-200 text-sm font-medium mt-1 leading-snug">
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
        <span className="text-slate-500 flex-shrink-0 mt-1">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: cfg.borderColor }}>

          {/* Rationale */}
          <div className="pt-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Fundamento clínico
            </p>
            <p className="text-slate-300 text-xs leading-relaxed">{p.rationale}</p>
          </div>

          {/* Actions */}
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Acciones recomendadas
            </p>
            <div className="space-y-2">
              {p.actions.map((action, i) => (
                <div
                  key={i}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{actionIcon(action.type)}</span>
                      <span className="text-slate-100 text-xs font-semibold">{action.label}</span>
                      {action.sets && action.reps && (
                        <span className="text-xs text-slate-500">
                          {action.sets}×{action.reps}
                        </span>
                      )}
                      {action.duration_min && (
                        <span className="text-xs text-slate-500">{action.duration_min} min</span>
                      )}
                    </div>
                    {action.video_url && (
                      <a
                        href={action.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                                   bg-red-900/40 text-red-300 hover:bg-red-800/50 transition border border-red-800/50"
                      >
                        ▶ Ver video
                      </a>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{action.description}</p>
                  {action.protocol && (
                    <p className="text-slate-600 text-xs mt-0.5 italic">
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
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
                Ajuste de carga
              </p>
              <div className="flex items-start gap-2">
                <LoadBadge
                  pct={p.load_adjustment.percentage}
                  target={p.load_adjustment.target}
                  days={p.load_adjustment.duration_days}
                />
                <p className="text-slate-400 text-xs leading-relaxed">
                  {p.load_adjustment.description}
                </p>
              </div>
            </div>
          )}

          {/* Biomechanical context */}
          {p.biomech_context && (
            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-3 py-2">
              <p className="text-indigo-300 text-xs">
                <span className="font-bold">⚙ Contexto biomecánico: </span>
                {p.biomech_context}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
