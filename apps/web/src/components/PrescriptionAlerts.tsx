"use client";

import { useState } from "react";
import type { Prescription } from "@vitatekh/shared";
import { ALERT_LEVEL_CONFIG } from "@vitatekh/shared";
import PrescriptionCard from "./PrescriptionCard";

interface Props {
  prescriptions: Prescription[];
  /** Si true, muestra el nombre del atleta en cada tarjeta */
  multiAthlete?: boolean;
}

const LEVEL_ORDER = ["red", "orange", "yellow", "info"] as const;

export default function PrescriptionAlerts({ prescriptions, multiAthlete = true }: Props) {
  const [filter, setFilter] = useState<string>("all");

  if (prescriptions.length === 0) return null;

  const redCount    = prescriptions.filter((p) => p.alert_level === "red").length;
  const orangeCount = prescriptions.filter((p) => p.alert_level === "orange").length;
  const yellowCount = prescriptions.filter((p) => p.alert_level === "yellow").length;

  const filtered = filter === "all"
    ? prescriptions
    : prescriptions.filter((p) => p.alert_level === filter);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-slate-200 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            🧠 Prescripciones Automáticas
            <span className="text-xs font-normal text-slate-500 normal-case tracking-normal">
              Motor de Reglas v1
            </span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {prescriptions.length} alerta{prescriptions.length > 1 ? "s" : ""} detectada{prescriptions.length > 1 ? "s" : ""}
            {redCount > 0 && <span className="text-red-400 font-bold"> · {redCount} crítica{redCount > 1 ? "s" : ""}</span>}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: `Todas (${prescriptions.length})`, color: "#94a3b8" },
            ...(redCount > 0
              ? [{ key: "red", label: `🔴 ${redCount}`, color: "#EF4444" }]
              : []),
            ...(orangeCount > 0
              ? [{ key: "orange", label: `🟠 ${orangeCount}`, color: "#F97316" }]
              : []),
            ...(yellowCount > 0
              ? [{ key: "yellow", label: `🟡 ${yellowCount}`, color: "#EAB308" }]
              : []),
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="text-xs px-3 py-1 rounded-full border transition"
              style={{
                borderColor: filter === key ? color : "#374151",
                color: filter === key ? color : "#9ca3af",
                backgroundColor: filter === key ? color + "22" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Prescription cards */}
      <div className="space-y-3">
        {filtered.map((p) => (
          <PrescriptionCard
            key={`${p.rule_id}-${p.athlete_id}`}
            prescription={p}
            showAthlete={multiAthlete}
            compact={prescriptions.length > 4}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-slate-700 text-xs">
        * Las prescripciones son generadas automáticamente por el Motor de Reglas de Vitatekh
        basado en evidencia científica. No sustituyen el criterio clínico del profesional.
      </p>
    </div>
  );
}
