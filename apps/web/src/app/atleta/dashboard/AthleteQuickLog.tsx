"use client";

/**
 * AthleteQuickLog — Formulario de registro rápido del atleta
 *
 * Sección 1: Registrar Sesión (RPE × minutos → sRPE)
 *   - training_sessions INSERT
 *   - session_rpe INSERT
 *
 * Sección 2: Check-in de Wellness diario
 *   - daily_wellness UPSERT (onConflict athlete_id,date)
 *   - Fatiga (1-10), Ánimo (1-5), Calidad de Sueño (1-5), Dolor Muscular (1-10)
 *
 * Nota sobre RPE:
 *   La UI muestra CR-10 (1-10). La DB guarda Borg (6-20).
 *   Conversión: borg = max(6, min(20, round(cr10 × 2)))
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { springPop } from "@/components/motion/primitives";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte CR-10 (1-10) → Borg RPE (6-20) */
function toBorgRpe(cr10: number): number {
  return Math.max(6, Math.min(20, Math.round(cr10 * 2)));
}

/** Etiqueta descriptiva del RPE CR-10 */
function rpeLabel(v: number): string {
  if (v <= 2) return "Muy ligero";
  if (v <= 4) return "Ligero";
  if (v <= 6) return "Moderado";
  if (v <= 8) return "Duro";
  if (v === 9) return "Muy duro";
  return "Máximo";
}

/** Color del slider según RPE */
function rpeColor(v: number): string {
  if (v <= 4) return "#22C55E";
  if (v <= 6) return "#EAB308";
  if (v <= 8) return "#F97316";
  return "#EF4444";
}

/** Color escala "menos es mejor" (fatiga, dolor 1-10) */
function loadScaleColor(v: number, max: number): string {
  const pct = v / max;
  if (pct <= 0.4) return "#22C55E";
  if (pct <= 0.7) return "#EAB308";
  return "#EF4444";
}

/** Color escala "más es mejor" (ánimo, calidad sueño 1-5) */
function positiveScaleColor(v: number, max: number): string {
  const pct = v / max;
  if (pct >= 0.7) return "#22C55E";
  if (pct >= 0.4) return "#EAB308";
  return "#EF4444";
}

const MOOD_LABELS = ["", "Muy bajo", "Bajo", "Neutral", "Bueno", "Excelente"];
const SLEEP_LABELS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  userId:    string;
  userName:  string;
  teamId:    string | null; // primer equipo del atleta (puede ser null)
}

type FormState = "idle" | "loading" | "success" | "error";

// ─── Slider reutilizable ──────────────────────────────────────────────────────

function MetricSlider({
  label, value, min, max, onChange, color, valueLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color: string;
  valueLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <motion.span
            key={value}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={springPop}
            className="text-2xl font-black inline-block"
            style={{ color }}
          >
            {value}
          </motion.span>
          {valueLabel && <span className="text-slate-400 text-xs">{valueLabel}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AthleteQuickLog({ userId, userName, teamId }: Props) {
  // ── Estado Sesión ──────────────────────────────────────────────────────────
  const [cr10Rpe,    setCr10Rpe]   = useState(5);
  const [durationMin, setDuration] = useState(60);
  const [sessionState, setSessionState] = useState<FormState>("idle");
  const [sessionMsg, setSessionMsg] = useState("");

  // ── Estado Wellness ────────────────────────────────────────────────────────
  const [fatigue,      setFatigue]      = useState(5);   // 1-10
  const [mood,         setMood]         = useState(3);   // 1-5
  const [sleepQuality, setSleepQuality] = useState(3);   // 1-5
  const [soreness,     setSoreness]     = useState(3);   // 1-10
  const [wellnessState, setWellnessState] = useState<FormState>("idle");
  const [wellnessMsg, setWellnessMsg]     = useState("");

  // ── Derived: sRPE ──────────────────────────────────────────────────────────
  const borgRpe = toBorgRpe(cr10Rpe);
  const srpe    = borgRpe * durationMin;

  // ── Submit: Sesión ─────────────────────────────────────────────────────────
  async function handleSessionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (durationMin < 1) return;
    setSessionState("loading");
    setSessionMsg("");

    const supabase  = createClient();
    const today     = new Date().toISOString().split("T")[0];

    // 1. Insertar training_session
    const { data: session, error: sessionErr } = await supabase
      .from("training_sessions")
      .insert({
        athlete_id:   userId,
        team_id:      teamId,       // null está permitido (ON DELETE SET NULL)
        date:         today,
        duration_min: durationMin,
        session_type: "physical",
        phase:        "competition",
        created_by:   userId,
      })
      .select("id")
      .single();

    if (sessionErr) {
      setSessionState("error");
      setSessionMsg(sessionErr.message);
      return;
    }

    // 2. Insertar session_rpe (rpe: Borg 6-20, srpe: rpe × min)
    const { error: rpeErr } = await supabase.from("session_rpe").insert({
      session_id: session.id,
      athlete_id: userId,
      rpe:        borgRpe,
      srpe:       srpe,
    });

    if (rpeErr) {
      setSessionState("error");
      setSessionMsg(rpeErr.message);
      return;
    }

    setSessionState("success");
    setSessionMsg(`Sesión guardada — sRPE: ${srpe} UA`);
    // Reset form
    setCr10Rpe(5);
    setDuration(60);
  }

  // ── Submit: Wellness ───────────────────────────────────────────────────────
  async function handleWellnessSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWellnessState("loading");
    setWellnessMsg("");

    const supabase = createClient();
    const today    = new Date().toISOString().split("T")[0];

    const { error: wellnessErr } = await supabase
      .from("daily_wellness")
      .upsert(
        {
          athlete_id:    userId,
          date:          today,
          fatigue:       Math.max(1, Math.min(10, fatigue)),
          mood:          Math.max(1, Math.min(5, mood)),
          sleep_quality: Math.max(1, Math.min(5, sleepQuality)),
          soreness:      Math.max(1, Math.min(10, soreness)),
        },
        { onConflict: "athlete_id,date" }
      );

    if (wellnessErr) {
      setWellnessState("error");
      setWellnessMsg(wellnessErr.message);
      return;
    }

    setWellnessState("success");
    setWellnessMsg("Check-in de hoy registrado");
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Saludo ── */}
      <div>
        <h1 className="text-2xl font-black text-slate-100">
          Hola, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Registra la sesión de hoy.</p>
      </div>

      {/* ════════════ SECCIÓN 1: SESIÓN ════════════ */}
      <div className="bg-[#111] border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className="text-slate-100 font-bold">Registrar Sesión</h2>
        </div>

        <form onSubmit={handleSessionSubmit} className="space-y-5">

          {/* RPE Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                RPE — Esfuerzo Percibido (1-10)
              </label>
              <div className="flex items-center gap-2">
                <motion.span
                  key={cr10Rpe}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={springPop}
                  className="text-2xl font-black inline-block"
                  style={{ color: rpeColor(cr10Rpe) }}
                >
                  {cr10Rpe}
                </motion.span>
                <span className="text-slate-400 text-xs">{rpeLabel(cr10Rpe)}</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={cr10Rpe}
              onChange={(e) => setCr10Rpe(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800"
              style={{
                accentColor: rpeColor(cr10Rpe),
              }}
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>1 Muy ligero</span>
              <span>5 Moderado</span>
              <span>10 Máximo</span>
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Duración (minutos)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={durationMin}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
              required
              className="w-full bg-black/40 border border-white/[0.09] rounded-lg px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#818cf8] focus:ring-2 focus:ring-[#818cf8]/20 transition-all"
            />
          </div>

          {/* sRPE Preview */}
          <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
            <div className="text-slate-500 text-xs">
              Carga de Sesión (sRPE)
              <span className="text-slate-600 ml-1">
                = RPE {borgRpe} × {durationMin} min
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-300">{srpe}</span>
              <span className="text-slate-500 text-xs ml-1">UA</span>
            </div>
          </div>

          {/* Feedback */}
          {sessionState === "success" && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <span>✅</span> {sessionMsg}
            </div>
          )}
          {sessionState === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>⚠</span> {sessionMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={sessionState === "loading"}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm tracking-wide py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sessionState === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Guardando…
              </span>
            ) : (
              "Guardar Sesión"
            )}
          </button>
        </form>
      </div>

      {/* ════════════ SECCIÓN 2: WELLNESS ════════════ */}
      <div className="bg-[#111] border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <h2 className="text-slate-100 font-bold">Check-in de Bienestar</h2>
        </div>
        <p className="text-slate-500 text-xs -mt-3">
          Registra cómo te sientes hoy. Alimenta tus tendencias de recuperación.
        </p>

        <form onSubmit={handleWellnessSubmit} className="space-y-6">

          <MetricSlider
            label="Fatiga (1-10)"
            value={fatigue}
            min={1}
            max={10}
            onChange={(v) => setFatigue(Math.max(1, Math.min(10, v)))}
            color={loadScaleColor(fatigue, 10)}
            valueLabel={fatigue <= 4 ? "Descansado" : fatigue <= 7 ? "Moderada" : "Agotado"}
          />

          <MetricSlider
            label="Ánimo (1-5)"
            value={mood}
            min={1}
            max={5}
            onChange={(v) => setMood(Math.max(1, Math.min(5, v)))}
            color={positiveScaleColor(mood, 5)}
            valueLabel={MOOD_LABELS[mood]}
          />

          <MetricSlider
            label="Calidad de Sueño (1-5)"
            value={sleepQuality}
            min={1}
            max={5}
            onChange={(v) => setSleepQuality(Math.max(1, Math.min(5, v)))}
            color={positiveScaleColor(sleepQuality, 5)}
            valueLabel={SLEEP_LABELS[sleepQuality]}
          />

          <MetricSlider
            label="Dolor Muscular (1-10)"
            value={soreness}
            min={1}
            max={10}
            onChange={(v) => setSoreness(Math.max(1, Math.min(10, v)))}
            color={loadScaleColor(soreness, 10)}
            valueLabel={soreness <= 4 ? "Leve" : soreness <= 7 ? "Moderado" : "Intenso"}
          />

          {/* Feedback */}
          {wellnessState === "success" && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <span>✅</span> {wellnessMsg}
            </div>
          )}
          {wellnessState === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>⚠</span> {wellnessMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={wellnessState === "loading"}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wide py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wellnessState === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Guardando…
              </span>
            ) : (
              "Guardar Check-in"
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
