"use client";

/**
 * AthleteQuickLog — Formulario de registro rápido del atleta
 *
 * Sección 1: Registrar Sesión (RPE × minutos → sRPE)
 *   - training_sessions INSERT
 *   - session_rpe INSERT
 *
 * Sección 2: Test Ratio H/Q
 *   - hq_evaluations INSERT
 *   - Calcula ratio = isquio/cuad automáticamente (campo GENERATED en DB)
 *   - Muestra semáforo de riesgo en tiempo real
 *
 * Nota sobre RPE:
 *   La UI muestra CR-10 (1-10). La DB guarda Borg (6-20).
 *   Conversión: borg = max(6, min(20, round(cr10 × 2)))
 */

import { useState } from "react";
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

/** Calcula ratio H/Q y semáforo (replicando lógica de la DB) */
function hqTrafficLight(
  hamstring: number,
  quad: number,
  type: "conventional" | "functional"
): { ratio: number; isRisk: boolean; color: string; label: string } {
  if (quad <= 0) return { ratio: 0, isRisk: false, color: "#6B7280", label: "—" };
  const ratio = hamstring / quad;
  const isRisk =
    type === "conventional" ? ratio < 0.6 : ratio < 1.0;
  const color = isRisk ? "#EF4444" : ratio < (type === "conventional" ? 0.7 : 1.1) ? "#EAB308" : "#22C55E";
  const label = isRisk
    ? "⚠ Riesgo"
    : ratio < (type === "conventional" ? 0.7 : 1.1)
    ? "Precaución"
    : "✓ Normal";
  return { ratio, isRisk, color, label };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  userId:    string;
  userName:  string;
  teamId:    string | null; // primer equipo del atleta (puede ser null)
}

type FormState = "idle" | "loading" | "success" | "error";

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AthleteQuickLog({ userId, userName, teamId }: Props) {
  // ── Estado Sesión ──────────────────────────────────────────────────────────
  const [cr10Rpe,    setCr10Rpe]   = useState(5);
  const [durationMin, setDuration] = useState(60);
  const [sessionState, setSessionState] = useState<FormState>("idle");
  const [sessionMsg, setSessionMsg] = useState("");

  // ── Estado H/Q ────────────────────────────────────────────────────────────
  const [hamstring,   setHamstring] = useState("");
  const [quadriceps,  setQuad]      = useState("");
  const [side,        setSide]      = useState<"left" | "right" | "bilateral">("bilateral");
  const [ratioType,   setRatioType] = useState<"conventional" | "functional">("conventional");
  const [hqState,     setHqState]   = useState<FormState>("idle");
  const [hqMsg,       setHqMsg]     = useState("");

  // ── Derived: sRPE y H/Q preview ───────────────────────────────────────────
  const borgRpe   = toBorgRpe(cr10Rpe);
  const srpe      = borgRpe * durationMin;
  const hamNum    = parseFloat(hamstring) || 0;
  const quadNum   = parseFloat(quadriceps) || 0;
  const hqPreview = hqTrafficLight(hamNum, quadNum, ratioType);

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

  // ── Submit: H/Q ───────────────────────────────────────────────────────────
  async function handleHqSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hamstring || !quadriceps || quadNum <= 0 || hamNum <= 0) return;
    setHqState("loading");
    setHqMsg("");

    const supabase = createClient();
    const today    = new Date().toISOString().split("T")[0];

    const { error: hqErr } = await supabase.from("hq_evaluations").insert({
      athlete_id:             userId,
      evaluated_by:           userId,   // auto-evaluación
      date:                   today,
      side,
      speed_deg_per_sec:      ratioType === "conventional" ? 60 : 180,
      ratio_type:             ratioType,
      quadriceps_peak_nm_kg:  quadNum,
      hamstring_peak_nm_kg:   hamNum,
    });

    if (hqErr) {
      setHqState("error");
      setHqMsg(hqErr.message);
      return;
    }

    setHqState("success");
    setHqMsg(
      `Ratio H/Q guardado: ${hqPreview.ratio.toFixed(3)} — ${hqPreview.label}`
    );
    setHamstring("");
    setQuad("");
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
                <span
                  className="text-2xl font-black"
                  style={{ color: rpeColor(cr10Rpe) }}
                >
                  {cr10Rpe}
                </span>
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

      {/* ════════════ SECCIÓN 2: H/Q TEST ════════════ */}
      <div className="bg-[#111] border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦵</span>
          <h2 className="text-slate-100 font-bold">Test Ratio H/Q</h2>
        </div>

        <form onSubmit={handleHqSubmit} className="space-y-5">

          {/* Tipo de ratio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Tipo de ratio
            </label>
            <div className="flex gap-2">
              {(["conventional", "functional"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRatioType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    ratioType === t
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}
                >
                  {t === "conventional"
                    ? "Convencional (60°/s)"
                    : "Funcional (180°/s)"}
                </button>
              ))}
            </div>
          </div>

          {/* Lado */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Lado evaluado
            </label>
            <div className="flex gap-2">
              {(["left", "right", "bilateral"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    side === s
                      ? "bg-slate-700 border-slate-500 text-slate-100"
                      : "border-slate-700/60 text-slate-600 hover:border-slate-600"
                  }`}
                >
                  {s === "left" ? "Izquierdo" : s === "right" ? "Derecho" : "Bilateral"}
                </button>
              ))}
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Isquiotibiales (Nm/kg)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="ej. 1.850"
                value={hamstring}
                onChange={(e) => setHamstring(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/[0.09] rounded-lg px-3 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#818cf8] focus:ring-2 focus:ring-[#818cf8]/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Cuádriceps (Nm/kg)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="ej. 2.100"
                value={quadriceps}
                onChange={(e) => setQuad(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/[0.09] rounded-lg px-3 py-3 text-slate-100 text-sm focus:outline-none focus:border-[#818cf8] focus:ring-2 focus:ring-[#818cf8]/20 transition-all"
              />
            </div>
          </div>

          {/* Ratio preview en tiempo real */}
          {hamNum > 0 && quadNum > 0 && (
            <div
              className="flex items-center justify-between rounded-xl border px-4 py-3"
              style={{
                borderColor: hqPreview.color + "55",
                backgroundColor: hqPreview.color + "11",
              }}
            >
              <div className="text-xs text-slate-400 space-y-0.5">
                <p>
                  Ratio H/Q ={" "}
                  <span className="font-mono">{hqNum(hamNum, quadNum)}</span>
                </p>
                <p className="text-slate-500">
                  Umbral {ratioType === "conventional" ? "conv. ≥ 0.60" : "func. ≥ 1.00"}
                </p>
              </div>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ color: hqPreview.color, backgroundColor: hqPreview.color + "22" }}
              >
                {hqPreview.label}
              </span>
            </div>
          )}

          {/* Feedback */}
          {hqState === "success" && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <span>✅</span> {hqMsg}
            </div>
          )}
          {hqState === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>⚠</span> {hqMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={hqState === "loading" || hamNum <= 0 || quadNum <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wide py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hqState === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Guardando…
              </span>
            ) : (
              "Guardar Test H/Q"
            )}
          </button>
        </form>
      </div>

    </div>
  );
}

// Tiny helper (evita tener el cálculo inline en el JSX)
function hqNum(h: number, q: number): string {
  return q > 0 ? (h / q).toFixed(3) : "—";
}
