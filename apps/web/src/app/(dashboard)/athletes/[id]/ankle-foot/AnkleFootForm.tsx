"use client";

/**
 * Formulario de evaluación avanzada de tobillo, pie y rendimiento funcional.
 * Inserta en ankle_foot_assessments (migración 009).
 *
 * Secciones:
 *  1. Biomecánica clínica — Feiss, ROM, WBLT, Windlass, pinzamiento, miofascial
 *  2. Fuerza y control motor — Daniels, Single-Leg Squat (checklist de compensaciones)
 *  3. Rendimiento — T-Test, Protocolo Bosco
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { springPop } from "@/components/motion/primitives";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  FootType,
  MyofascialStatus,
  SlsOverallStatus,
  SingleLegSquatResult,
} from "@vitatekh/shared";
import { WBLT_RISK_CM, DORSIFLEXION_RISK_DEG } from "@vitatekh/shared";

// ─── Opciones ─────────────────────────────────────────────────────────────────

const FOOT_TYPES: { value: FootType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "flat",   label: "Plano" },
  { value: "cavus",  label: "Cavo" },
];

const MYOFASCIAL: { value: MyofascialStatus; label: string; desc: string }[] = [
  { value: "optimal",    label: "Óptimo",      desc: "Tono y extensibilidad normales" },
  { value: "hypertonic", label: "Hipertónico", desc: "Tono aumentado, restricción" },
  { value: "phasic",     label: "Fásico",      desc: "Débil / inhibido" },
];

const SLS_STATUS: { value: SlsOverallStatus; label: string; color: string }[] = [
  { value: "optimal",     label: "Óptimo",     color: "text-[#6f9c4a] border-[#6f9c4a]/60" },
  { value: "compensated", label: "Compensado", color: "text-[#b5761f] border-[#d9902a]/60" },
  { value: "deficient",   label: "Deficiente", color: "text-[#c0492f] border-[#c0492f]/60" },
];

const SLS_COMPENSATIONS = [
  { key: "knee_valgus",    label: "Valgo de rodilla" },
  { key: "pelvic_drop",    label: "Caída pélvica" },
  { key: "trunk_rotation", label: "Rotación de tronco" },
] as const;

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e4d8c4] bg-[#fdf9f2] p-5 mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#c65f3f] mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NumField({
  label, value, onChange, unit, placeholder, warn,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  warn?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-[#8a7660] uppercase">
        {label} {unit && <span className="text-[#b0a08c]">({unit})</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-[#f7efe2] border rounded-lg px-3 py-2.5 text-[#3a2c1e] text-sm text-center
          placeholder-[#b0a08c] focus:outline-none focus:ring-2 focus:ring-[#c65f3f]/30 transition-all
          ${warn ? "border-[#d9902a]/60" : "border-[#e4d8c4] focus:border-[#c65f3f]"}`}
      />
    </label>
  );
}

function Toggle({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      animate={{ scale: checked ? 1.03 : 1 }}
      whileTap={{ scale: 0.97 }}
      transition={springPop}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-colors duration-200
        ${checked
          ? "border-[#c65f3f] bg-[#c65f3f]/15 text-[#c65f3f]"
          : "border-[#e4d8c4] bg-[#f7efe2] text-[#8a7660] hover:border-[#d6c6ac]"}`}
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold transition-colors
          ${checked ? "bg-[#c65f3f] border-[#c65f3f] text-[#3a2c1e]" : "border-[#d6c6ac]"}`}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </motion.button>
  );
}

// ─── Formulario principal ─────────────────────────────────────────────────────

interface SlsState {
  knee_valgus: boolean;
  pelvic_drop: boolean;
  trunk_rotation: boolean;
  overall_status: SlsOverallStatus;
}

const EMPTY_SLS: SlsState = {
  knee_valgus: false,
  pelvic_drop: false,
  trunk_rotation: false,
  overall_status: "optimal",
};

export default function AnkleFootForm({
  athleteId,
  professionalId,
}: {
  athleteId: string;
  professionalId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  // Biomecánica
  const [footTypeLeft, setFootTypeLeft]   = useState<FootType | "">("");
  const [footTypeRight, setFootTypeRight] = useState<FootType | "">("");
  const [dorsiLeft, setDorsiLeft]         = useState("");
  const [dorsiRight, setDorsiRight]       = useState("");
  const [plantiLeft, setPlantiLeft]       = useState("");
  const [plantiRight, setPlantiRight]     = useState("");
  const [wbltLeft, setWbltLeft]           = useState("");
  const [wbltRight, setWbltRight]         = useState("");
  const [windlassLeft, setWindlassLeft]   = useState(false);
  const [windlassRight, setWindlassRight] = useState(false);
  const [impingLeft, setImpingLeft]       = useState(false);
  const [impingRight, setImpingRight]     = useState(false);
  const [myofascial, setMyofascial]       = useState<MyofascialStatus | "">("");

  // Fuerza y control motor
  const [danielsLeft, setDanielsLeft]   = useState("");
  const [danielsRight, setDanielsRight] = useState("");
  const [slsLeft, setSlsLeft]           = useState<SlsState>({ ...EMPTY_SLS });
  const [slsRight, setSlsRight]         = useState<SlsState>({ ...EMPTY_SLS });

  // Rendimiento
  const [tTest, setTTest]         = useState("");
  const [squatJump, setSquatJump] = useState("");
  const [cmj, setCmj]             = useState("");
  const [rsi, setRsi]             = useState("");

  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const num = (s: string): number | null => {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  function updateSls(
    side: "left" | "right",
    patch: Partial<SlsState>
  ) {
    const setter = side === "left" ? setSlsLeft : setSlsRight;
    setter((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const boscoValues = [num(squatJump), num(cmj), num(rsi)];
    const hasBosco = boscoValues.some((v) => v !== null);

    const slsPayload = (s: SlsState): SingleLegSquatResult => ({
      knee_valgus: s.knee_valgus,
      pelvic_drop: s.pelvic_drop,
      trunk_rotation: s.trunk_rotation,
      overall_status: s.overall_status,
    });

    const { error: insertError } = await supabase
      .from("ankle_foot_assessments")
      .insert({
        athlete_id:                 athleteId,
        evaluated_by:               professionalId,
        foot_type_left:             footTypeLeft || null,
        foot_type_right:            footTypeRight || null,
        dorsiflexion_rom_left:      num(dorsiLeft),
        dorsiflexion_rom_right:     num(dorsiRight),
        plantiflexion_rom_left:     num(plantiLeft),
        plantiflexion_rom_right:    num(plantiRight),
        wblt_cm_left:               num(wbltLeft),
        wblt_cm_right:              num(wbltRight),
        windlass_test_left:         windlassLeft,
        windlass_test_right:        windlassRight,
        anterior_impingement_left:  impingLeft,
        anterior_impingement_right: impingRight,
        myofascial_status:          myofascial || null,
        daniels_muscle_grade_left:  num(danielsLeft),
        daniels_muscle_grade_right: num(danielsRight),
        single_leg_squat_left:      slsPayload(slsLeft),
        single_leg_squat_right:     slsPayload(slsRight),
        agility_t_test_seconds:     num(tTest),
        bosco_protocol: hasBosco
          ? {
              squat_jump_cm: num(squatJump) ?? 0,
              cmj_cm:        num(cmj) ?? 0,
              drop_jump_rsi: num(rsi) ?? 0,
            }
          : null,
        notes: notes || null,
      });

    setSubmitting(false);

    if (insertError) {
      setError(`No se pudo guardar: ${insertError.message}`);
      return;
    }

    router.push(`/athletes/${athleteId}?saved=ankle-foot`);
    router.refresh();
  }

  const wbltWarnL  = num(wbltLeft) !== null && num(wbltLeft)! < WBLT_RISK_CM;
  const wbltWarnR  = num(wbltRight) !== null && num(wbltRight)! < WBLT_RISK_CM;
  const dorsiWarnL = num(dorsiLeft) !== null && num(dorsiLeft)! < DORSIFLEXION_RISK_DEG;
  const dorsiWarnR = num(dorsiRight) !== null && num(dorsiRight)! < DORSIFLEXION_RISK_DEG;

  return (
    <form onSubmit={handleSubmit}>
      {/* ── 1. Biomecánica clínica ── */}
      <SectionCard title="1 · Biomecánica y Parámetros Clínicos">
        {/* Tipo de pisada — Feiss */}
        <p className="text-[11px] font-semibold tracking-wide text-[#8a7660] uppercase mb-2">
          Tipo de pisada — Test de Línea de Feiss
        </p>
        <div className="grid grid-cols-2 gap-4 mb-5">
          {(["left", "right"] as const).map((side) => {
            const value  = side === "left" ? footTypeLeft : footTypeRight;
            const setter = side === "left" ? setFootTypeLeft : setFootTypeRight;
            return (
              <div key={side}>
                <p className="text-xs text-[#b0a08c] mb-1.5">
                  {side === "left" ? "Pie izquierdo" : "Pie derecho"}
                </p>
                <div className="flex gap-2">
                  {FOOT_TYPES.map((ft) => (
                    <motion.button
                      key={ft.value}
                      type="button"
                      onClick={() => setter(value === ft.value ? "" : ft.value)}
                      animate={{ scale: value === ft.value ? 1.03 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      transition={springPop}
                      className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-colors duration-200
                        ${value === ft.value
                          ? "border-[#c65f3f] bg-[#c65f3f]/15 text-[#c65f3f]"
                          : "border-[#e4d8c4] bg-[#f7efe2] text-[#8a7660] hover:border-[#d6c6ac]"}`}
                    >
                      {ft.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ROM */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <NumField label="Dorsiflexión Izq" unit="°" value={dorsiLeft}  onChange={setDorsiLeft}  placeholder="20" warn={dorsiWarnL} />
          <NumField label="Dorsiflexión Der" unit="°" value={dorsiRight} onChange={setDorsiRight} placeholder="20" warn={dorsiWarnR} />
          <NumField label="Plantiflexión Izq" unit="°" value={plantiLeft}  onChange={setPlantiLeft}  placeholder="45" />
          <NumField label="Plantiflexión Der" unit="°" value={plantiRight} onChange={setPlantiRight} placeholder="45" />
        </div>

        {/* WBLT */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <NumField label="WBLT Izquierdo" unit="cm" value={wbltLeft}  onChange={setWbltLeft}  placeholder="12" warn={wbltWarnL} />
          <NumField label="WBLT Derecho"   unit="cm" value={wbltRight} onChange={setWbltRight} placeholder="12" warn={wbltWarnR} />
        </div>
        {(wbltWarnL || wbltWarnR || dorsiWarnL || dorsiWarnR) && (
          <p className="text-xs text-[#b5761f] mb-4">
            ⚠ Valores bajo el umbral (WBLT &lt; {WBLT_RISK_CM} cm / dorsiflexión &lt; {DORSIFLEXION_RISK_DEG}°) —
            el Motor de Reglas generará una alerta de movilidad.
          </p>
        )}

        {/* Booleanos */}
        <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
          <Toggle label="Windlass ⊕ Izquierdo"    checked={windlassLeft}  onChange={setWindlassLeft} />
          <Toggle label="Windlass ⊕ Derecho"      checked={windlassRight} onChange={setWindlassRight} />
          <Toggle label="Pinzamiento ant. Izq"    checked={impingLeft}    onChange={setImpingLeft} />
          <Toggle label="Pinzamiento ant. Der"    checked={impingRight}   onChange={setImpingRight} />
        </div>

        {/* Miofascial */}
        <p className="text-[11px] font-semibold tracking-wide text-[#8a7660] uppercase mb-2">
          Estado miofascial — gastro-sóleo-calcáneo-fascia plantar
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {MYOFASCIAL.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMyofascial(myofascial === m.value ? "" : m.value)}
              className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-all
                ${myofascial === m.value
                  ? "border-[#c65f3f] bg-[#c65f3f]/15"
                  : "border-[#e4d8c4] bg-[#f7efe2] hover:border-[#d6c6ac]"}`}
            >
              <span className={`block text-sm font-semibold ${myofascial === m.value ? "text-[#c65f3f]" : "text-[#8a7660]"}`}>
                {m.label}
              </span>
              <span className="block text-[11px] text-[#b0a08c]">{m.desc}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── 2. Fuerza y control motor ── */}
      <SectionCard title="2 · Fuerza y Control Motor">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <NumField label="Daniels Izquierdo" unit="0-5" value={danielsLeft}  onChange={setDanielsLeft}  placeholder="5" />
          <NumField label="Daniels Derecho"   unit="0-5" value={danielsRight} onChange={setDanielsRight} placeholder="5" />
        </div>

        <p className="text-[11px] font-semibold tracking-wide text-[#8a7660] uppercase mb-3">
          Single-Leg Squat — checklist de compensaciones
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(["left", "right"] as const).map((side) => {
            const state = side === "left" ? slsLeft : slsRight;
            return (
              <div key={side} className="rounded-lg border border-[#e4d8c4] bg-[#f7efe2] p-4">
                <p className="text-xs font-semibold text-[#8a7660] mb-3">
                  {side === "left" ? "🦵 Pierna izquierda" : "🦵 Pierna derecha"}
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {SLS_COMPENSATIONS.map((c) => (
                    <Toggle
                      key={c.key}
                      label={c.label}
                      checked={state[c.key]}
                      onChange={(v) => updateSls(side, { [c.key]: v })}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[#b0a08c] mb-1.5">Estado general</p>
                <div className="flex gap-1.5">
                  {SLS_STATUS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateSls(side, { overall_status: s.value })}
                      className={`flex-1 px-1 py-1.5 rounded-md border text-[11px] font-semibold transition-all
                        ${state.overall_status === s.value
                          ? `${s.color} bg-[#fdf9f2]`
                          : "border-[#e4d8c4] text-[#b0a08c] hover:border-[#d6c6ac]"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── 3. Rendimiento ── */}
      <SectionCard title="3 · Agilidad y Pliometría — Rendimiento">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumField label="T-Test"      unit="s"  value={tTest}     onChange={setTTest}     placeholder="10.2" />
          <NumField label="Squat Jump"  unit="cm" value={squatJump} onChange={setSquatJump} placeholder="35" />
          <NumField label="CMJ"         unit="cm" value={cmj}       onChange={setCmj}       placeholder="40" />
          <NumField label="Drop Jump"   unit="RSI" value={rsi}      onChange={setRsi}       placeholder="1.4" />
        </div>
        <p className="text-[11px] text-[#b0a08c] mt-3">
          Baremos: T-Test ≤ 11.5 s · CMJ ≥ 30 cm · RSI ≥ 1.0. Valores inferiores activan la regla de
          ajuste de agilidad/pliometría.
        </p>
      </SectionCard>

      {/* Notas */}
      <SectionCard title="Notas clínicas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Observaciones, contexto de la evaluación, derivaciones…"
          className="w-full bg-[#f7efe2] border border-[#e4d8c4] rounded-lg px-3 py-2.5 text-[#3a2c1e] text-sm
            placeholder-[#b0a08c] focus:outline-none focus:border-[#c65f3f] focus:ring-2 focus:ring-[#c65f3f]/30"
        />
      </SectionCard>

      {error && (
        <p className="text-sm text-[#c0492f] mb-4">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#c65f3f] hover:bg-[#c65f3f] active:bg-[#a8472a] disabled:opacity-50
          text-[#3a2c1e] font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors"
      >
        {submitting ? "Guardando…" : "Guardar Evaluación"}
      </button>
    </form>
  );
}
