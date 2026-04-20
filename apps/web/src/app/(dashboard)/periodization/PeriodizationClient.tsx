"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { SPORT_LABELS } from "@vitatekh/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team   { id: string; name: string; sport: string }
interface Plan   {
  id: string; team_id: string; name: string;
  model: string; start_date: string; end_date: string;
}
interface Cycle  {
  id: string; plan_id: string; parent_id?: string;
  level: "macrocycle" | "mesocycle" | "microcycle";
  name: string; phase: string;
  start_date: string; end_date: string;
  objectives?: string;
}

interface Props {
  teams: Team[];
  plans: Plan[];
  cycles: Cycle[];
  userId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  preseason:   { label: "Pretemporada",  color: "#3B82F6" },
  competition: { label: "Competición",   color: "#22C55E" },
  transition:  { label: "Transición",    color: "#F59E0B" },
};

const MODEL_LABELS: Record<string, string> = {
  classic: "Clásica (Matveyev)",
  tactical: "Periodización Táctica",
};

const LEVEL_CONFIG: Record<string, { label: string; indent: string; textSize: string; bg: string }> = {
  macrocycle: { label: "Macrociclo", indent: "ml-0",  textSize: "text-sm",  bg: "bg-indigo-900/30 border-indigo-700/50" },
  mesocycle:  { label: "Mesociclo",  indent: "ml-6",  textSize: "text-xs",  bg: "bg-slate-800/60 border-slate-700/50"   },
  microcycle: { label: "Microciclo", indent: "ml-12", textSize: "text-xs",  bg: "bg-slate-800/30 border-slate-700/30"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffDays(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  ) + 1;
}

function diffWeeks(start: string, end: string) {
  return Math.ceil(diffDays(start, end) / 7);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isActive(start: string, end: string) {
  const today = new Date().toISOString().split("T")[0]!;
  return today >= start && today <= end;
}

// ─── Timeline Bar ─────────────────────────────────────────────────────────────

function TimelineBar({ cycles, planStart, planEnd }: {
  cycles: Cycle[];
  planStart: string;
  planEnd: string;
}) {
  const totalDays = diffDays(planStart, planEnd);
  const mesos = cycles.filter((c) => c.level === "mesocycle");

  return (
    <div className="mt-4">
      <div className="flex h-8 rounded-lg overflow-hidden border border-slate-700 relative">
        {mesos.map((m) => {
          const start = m.start_date < planStart ? planStart : m.start_date;
          const end   = m.end_date   > planEnd   ? planEnd   : m.end_date;
          const offsetPct = (diffDays(planStart, start) - 1) / totalDays * 100;
          const widthPct  = diffDays(start, end) / totalDays * 100;
          const phaseCfg  = PHASE_LABELS[m.phase] ?? { label: m.phase, color: "#6B7280" };
          const active    = isActive(m.start_date, m.end_date);

          return (
            <div
              key={m.id}
              className="absolute h-full flex items-center justify-center text-xs font-medium truncate px-1 transition-opacity"
              style={{
                left: `${offsetPct}%`,
                width: `${widthPct}%`,
                backgroundColor: phaseCfg.color + (active ? "55" : "22"),
                borderRight: "1px solid #1e293b",
                color: phaseCfg.color,
                opacity: active ? 1 : 0.7,
              }}
              title={`${m.name} (${fmt(m.start_date)} – ${fmt(m.end_date)})`}
            >
              {widthPct > 8 ? m.name : ""}
            </div>
          );
        })}
      </div>

      {/* Phase legend */}
      <div className="flex gap-4 mt-2">
        {Object.entries(PHASE_LABELS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color + "55", border: `1px solid ${color}` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── New Plan Form ────────────────────────────────────────────────────────────

function NewPlanForm({ teams, userId, onCreated }: {
  teams: Team[];
  userId: string;
  onCreated: (plan: Plan) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "", team_id: "", model: "classic",
    start_date: "", end_date: "",
  });
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.name || !form.team_id || !form.start_date || !form.end_date) {
      setErr("Completa todos los campos.");
      return;
    }
    if (form.start_date >= form.end_date) {
      setErr("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("periodization_plans")
        .insert({
          name:       form.name,
          team_id:    form.team_id,
          model:      form.model,
          start_date: form.start_date,
          end_date:   form.end_date,
          created_by: userId,
        })
        .select()
        .single();

      if (error) { setErr(error.message); return; }
      onCreated(data);
      setOpen(false);
      setForm({ name: "", team_id: "", model: "classic", start_date: "", end_date: "" });
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
      >
        + Nuevo plan
      </button>
    );
  }

  return (
    <div className="bg-surface border border-indigo-700/50 rounded-xl p-5 space-y-4">
      <h3 className="text-slate-100 font-bold text-sm">Nuevo Plan de Periodización</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-slate-400 text-xs mb-1">Nombre del plan</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Temporada 2025-2026"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Equipo</label>
          <select
            value={form.team_id}
            onChange={(e) => setForm({ ...form, team_id: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar equipo…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({SPORT_LABELS[t.sport] ?? t.sport})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Modelo de periodización</label>
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="classic">Clásica (Matveyev)</option>
            <option value="tactical">Periodización Táctica</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Fecha inicio</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Fecha fin</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {err && (
          <p className="sm:col-span-2 text-red-400 text-xs">{err}</p>
        )}

        <div className="sm:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {isPending ? "Guardando…" : "Crear plan"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── New Cycle Form ───────────────────────────────────────────────────────────

function NewCycleForm({ planId, cycles, onCreated }: {
  planId: string;
  cycles: Cycle[];
  onCreated: (c: Cycle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "", level: "mesocycle" as Cycle["level"],
    phase: "preseason", start_date: "", end_date: "",
    objectives: "", parent_id: "",
  });
  const [err, setErr] = useState("");

  const macros = cycles.filter((c) => c.plan_id === planId && c.level === "macrocycle");
  const mesos  = cycles.filter((c) => c.plan_id === planId && c.level === "mesocycle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.name || !form.start_date || !form.end_date) {
      setErr("Completa nombre y fechas.");
      return;
    }
    if (form.start_date >= form.end_date) {
      setErr("Fecha fin debe ser posterior a inicio.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("periodization_cycles")
        .insert({
          plan_id:    planId,
          parent_id:  form.parent_id || null,
          level:      form.level,
          name:       form.name,
          phase:      form.phase,
          start_date: form.start_date,
          end_date:   form.end_date,
          objectives: form.objectives || null,
        })
        .select()
        .single();

      if (error) { setErr(error.message); return; }
      onCreated(data);
      setOpen(false);
      setForm({ name: "", level: "mesocycle", phase: "preseason", start_date: "", end_date: "", objectives: "", parent_id: "" });
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded-lg transition"
      >
        + Ciclo
      </button>
    );
  }

  return (
    <div className="mt-3 bg-slate-800/50 border border-slate-600 rounded-xl p-4 space-y-3">
      <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider">Nuevo ciclo</h4>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre del ciclo (ej. Mesociclo 1 — Base)"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value as Cycle["level"] })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="macrocycle">Macrociclo</option>
            <option value="mesocycle">Mesociclo</option>
            <option value="microcycle">Microciclo</option>
          </select>
        </div>

        <div>
          <select
            value={form.phase}
            onChange={(e) => setForm({ ...form, phase: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="preseason">Pretemporada</option>
            <option value="competition">Competición</option>
            <option value="transition">Transición</option>
          </select>
        </div>

        {/* Parent cycle (optional) */}
        {form.level === "mesocycle" && macros.length > 0 && (
          <div className="col-span-2">
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin macrociclo padre (opcional)</option>
              {macros.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        {form.level === "microcycle" && mesos.length > 0 && (
          <div className="col-span-2">
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin mesociclo padre (opcional)</option>
              {mesos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-slate-500 text-xs mb-1">Inicio</label>
          <input type="date" value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-xs mb-1">Fin</label>
          <input type="date" value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="col-span-2">
          <textarea
            value={form.objectives}
            onChange={(e) => setForm({ ...form, objectives: e.target.value })}
            placeholder="Objetivos del ciclo (opcional)…"
            rows={2}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {err && <p className="col-span-2 text-red-400 text-xs">{err}</p>}

        <div className="col-span-2 flex gap-2">
          <button
            type="submit" disabled={isPending}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
          >
            {isPending ? "Guardando…" : "Añadir ciclo"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, teams, cycles, onCycleCreated,
}: {
  plan: Plan;
  teams: Team[];
  cycles: Cycle[];
  onCycleCreated: (c: Cycle) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const team       = teams.find((t) => t.id === plan.team_id);
  const planCycles = cycles.filter((c) => c.plan_id === plan.id);
  const totalWeeks = diffWeeks(plan.start_date, plan.end_date);
  const active     = isActive(plan.start_date, plan.end_date);

  // Build hierarchy: macro → meso → micro
  const macros = planCycles.filter((c) => c.level === "macrocycle");
  const mesos  = planCycles.filter((c) => c.level === "mesocycle");
  const micros = planCycles.filter((c) => c.level === "microcycle");

  // Flat ordered list for display (macro, then its mesos, then micro)
  const ordered: Cycle[] = [];
  macros.forEach((macro) => {
    ordered.push(macro);
    const myMesos = mesos.filter((m) => m.parent_id === macro.id);
    myMesos.forEach((meso) => {
      ordered.push(meso);
      micros.filter((mi) => mi.parent_id === meso.id).forEach((micro) => ordered.push(micro));
    });
    // Mesos without parent (or unmatched)
    mesos.filter((m) => !m.parent_id && !ordered.includes(m)).forEach((m) => {
      ordered.push(m);
    });
  });
  // Remaining mesos/micros not under any macro
  mesos.filter((m) => !ordered.includes(m)).forEach((m) => {
    ordered.push(m);
    micros.filter((mi) => mi.parent_id === m.id).forEach((micro) => ordered.push(micro));
  });
  micros.filter((mi) => !ordered.includes(mi)).forEach((mi) => ordered.push(mi));

  return (
    <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
      {/* Plan header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? "bg-green-400" : "bg-slate-600"}`} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-100 font-bold">{plan.name}</h3>
              {active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">
                  Activo
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {team ? `${team.name} · ${SPORT_LABELS[team.sport] ?? team.sport}` : "—"}
              {" · "}
              {MODEL_LABELS[plan.model] ?? plan.model}
              {" · "}
              {totalWeeks} semanas
              {" · "}
              {fmt(plan.start_date)} → {fmt(plan.end_date)}
            </p>
          </div>
        </div>
        <span className="text-slate-500 text-lg">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Timeline */}
          {planCycles.some((c) => c.level === "mesocycle") && (
            <TimelineBar
              cycles={planCycles}
              planStart={plan.start_date}
              planEnd={plan.end_date}
            />
          )}

          {/* Cycle list */}
          {ordered.length === 0 ? (
            <p className="text-slate-600 text-sm italic">
              Sin ciclos añadidos aún. Crea un macrociclo para empezar.
            </p>
          ) : (
            <div className="space-y-2">
              {ordered.map((cycle) => {
                const cfg       = LEVEL_CONFIG[cycle.level] ?? LEVEL_CONFIG["mesocycle"]!;
                const phaseCfg  = PHASE_LABELS[cycle.phase] ?? { label: cycle.phase, color: "#6B7280" };
                const weeks     = diffWeeks(cycle.start_date, cycle.end_date);
                const cycActive = isActive(cycle.start_date, cycle.end_date);

                return (
                  <div
                    key={cycle.id}
                    className={`${cfg.indent} border rounded-lg px-3 py-2 ${cfg.bg} flex items-start gap-3`}
                  >
                    <div
                      className="w-1.5 flex-shrink-0 rounded-full mt-1"
                      style={{
                        backgroundColor: phaseCfg.color,
                        height: "calc(100% - 8px)",
                        minHeight: "16px",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`${cfg.textSize} font-semibold text-slate-200`}>
                          {cycle.name}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ color: phaseCfg.color, backgroundColor: phaseCfg.color + "22" }}
                        >
                          {phaseCfg.label}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                          {cfg.label}
                        </span>
                        {cycActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                            Semana actual
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {fmt(cycle.start_date)} → {fmt(cycle.end_date)}
                        {" · "}
                        {weeks} sem{weeks > 1 ? "anas" : "ana"}
                      </p>
                      {cycle.objectives && (
                        <p className="text-slate-400 text-xs mt-1 italic">{cycle.objectives}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add cycle */}
          <NewCycleForm
            planId={plan.id}
            cycles={cycles}
            onCreated={onCycleCreated}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PeriodizationClient({
  teams,
  plans: initialPlans,
  cycles: initialCycles,
  userId,
}: Props) {
  const [plans,  setPlans]  = useState<Plan[]>(initialPlans);
  const [cycles, setCycles] = useState<Cycle[]>(initialCycles);

  function handlePlanCreated(plan: Plan) {
    setPlans((prev) => [plan, ...prev]);
  }

  function handleCycleCreated(cycle: Cycle) {
    setCycles((prev) => [...prev, cycle].sort(
      (a, b) => a.start_date.localeCompare(b.start_date)
    ));
  }

  // Stats
  const activePlans = plans.filter((p) => isActive(p.start_date, p.end_date));
  const totalCycles = cycles.length;
  const activeCycle = cycles.find((c) => isActive(c.start_date, c.end_date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100">Periodización</h1>
          <p className="text-slate-400 text-sm mt-1">
            Planificación de macrociclos, mesociclos y microciclos
          </p>
        </div>
        <NewPlanForm
          teams={teams}
          userId={userId}
          onCreated={handlePlanCreated}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-slate-700 rounded-xl p-5">
          <p className="text-3xl font-black text-slate-100">{plans.length}</p>
          <p className="text-slate-400 text-sm mt-1">Planes totales</p>
        </div>
        <div className="bg-surface border border-slate-700 rounded-xl p-5">
          <p className="text-3xl font-black text-green-400">{activePlans.length}</p>
          <p className="text-slate-400 text-sm mt-1">Planes activos</p>
        </div>
        <div className="bg-surface border border-slate-700 rounded-xl p-5">
          <p className="text-3xl font-black text-indigo-400">{totalCycles}</p>
          <p className="text-slate-400 text-sm mt-1">Ciclos registrados</p>
        </div>
      </div>

      {/* Current cycle callout */}
      {activeCycle && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-indigo-400 text-lg">📅</span>
          <div>
            <p className="text-indigo-200 font-semibold text-sm">
              Ciclo actual: {activeCycle.name}
            </p>
            <p className="text-slate-400 text-xs">
              {PHASE_LABELS[activeCycle.phase]?.label ?? activeCycle.phase}
              {" · "}
              {fmt(activeCycle.start_date)} → {fmt(activeCycle.end_date)}
              {" · "}
              {LEVEL_CONFIG[activeCycle.level]?.label}
            </p>
            {activeCycle.objectives && (
              <p className="text-slate-500 text-xs italic mt-0.5">{activeCycle.objectives}</p>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      {plans.length === 0 ? (
        <div className="bg-surface border border-slate-700 rounded-xl p-16 text-center">
          <p className="text-slate-400 text-2xl mb-3">📋</p>
          <p className="text-slate-300 font-semibold">Sin planes de periodización</p>
          <p className="text-slate-500 text-sm mt-2">
            Crea tu primer plan usando el botón superior y añade macrociclos, mesociclos y microciclos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              teams={teams}
              cycles={cycles}
              onCycleCreated={handleCycleCreated}
            />
          ))}
        </div>
      )}

      {/* Reference */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-slate-600 text-xs">
          <strong className="text-slate-500">Periodización Clásica (Matveyev):</strong> volumen alto → intensidad alta → competición → transición. &nbsp;
          <strong className="text-slate-500">Periodización Táctica:</strong> semana tipo estructurada según el partido; morfociclo como unidad básica.
        </p>
      </div>
    </div>
  );
}
