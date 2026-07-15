"use client";

/**
 * /register — Registro unificado con soporte de Perfil Dual
 *
 * Flujo:
 *  1. El usuario elige su rol principal (Profesional / Atleta).
 *  2. Puede activar "Perfil Dual" para tener acceso a ambos dashboards.
 *  3. signUp() guarda role, sport, dual_mode en raw_user_meta_data.
 *  4. El trigger handle_new_user() crea el perfil con el role principal.
 *  5. dual_mode se lee en los layouts para mostrar el switcher de vista.
 */

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "professional" | "athlete";

const SPORTS = [
  { value: "football",   label: "⚽  Fútbol" },
  { value: "basketball", label: "🏀  Baloncesto" },
  { value: "volleyball", label: "🏐  Voleibol" },
] as const;

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function RoleCard({
  active, onClick, emoji, title, description, accentColor,
}: {
  active: boolean; onClick: () => void; emoji: string;
  title: string; description: string; accentColor: "indigo" | "emerald";
}) {
  const border = active
    ? accentColor === "indigo"
      ? "border-brand bg-brand/10"
      : "border-success bg-success/10"
    : "border-line bg-surface hover:border-line-strong";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none ${border}`}
    >
      <span className="text-xl">{emoji}</span>
      <p className="text-ink text-sm font-semibold">{title}</p>
      <p className="text-ink-soft text-xs leading-snug">{description}</p>
      {active && (
        <span className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${
          accentColor === "indigo" ? "text-brand" : "text-success"
        }`}>
          ✓ Seleccionado
        </span>
      )}
    </button>
  );
}

/** Toggle switch animado */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
        on ? "bg-brand border-brand" : "bg-surface-high border-line"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [role,      setRole]      = useState<Role>("professional");
  const [dualMode,  setDualMode]  = useState(false);
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [sport,     setSport]     = useState("football");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const isAthlete    = role === "athlete";
  const needsSport   = isAthlete || dualMode;   // dual profesional también necesita deporte
  const secondaryRole: Role = isAthlete ? "professional" : "athlete";

  const btnClass = isAthlete
    ? "bg-success hover:bg-success active:bg-success-dark focus-visible:ring-success/50"
    : "bg-brand hover:bg-brand-dark active:bg-brand-deep focus-visible:ring-brand/50";

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:  fullName,
          role,                            // rol principal → trigger lo copia a profiles.role
          dual_mode:  dualMode,            // leído en layouts para mostrar switcher
          ...(needsSport ? { sport } : {}),
        },
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setDone(true);
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void px-4 auth-grid-bg">
        <div className="w-full max-w-sm text-center rounded-2xl border border-line bg-surface p-10 shadow-xl shadow-brand-dark/10">
          <div className="text-5xl mb-6">✅</div>
          <h2 className="text-2xl font-black text-ink mb-3">¡Cuenta creada!</h2>
          <p className="text-ink-soft text-sm leading-relaxed mb-6">
            Revisa tu correo para confirmar la cuenta, luego inicia sesión.
          </p>

          {/* Resumen de accesos */}
          <div className="bg-surface-high border border-line rounded-xl px-4 py-3 text-left mb-6 space-y-2">
            <p className="text-ink-soft text-[11px] font-bold uppercase tracking-wider mb-1">
              Tus accesos
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAthlete ? "bg-success" : "bg-brand-light"}`} />
              <span className="text-ink-body text-sm">
                Dashboard {isAthlete ? "Atleta" : "Profesional"} — acceso principal
              </span>
            </div>
            {dualMode && (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isAthlete ? "bg-brand-light" : "bg-success"}`} />
                <span className="text-ink-body text-sm">
                  {isAthlete ? "Dashboard Profesional" : "Vista Atleta"} — acceso secundario
                </span>
              </div>
            )}
            {!dualMode && isAthlete && (
              <p className="text-ink-soft text-xs pt-1">
                Tu entrenador te vinculará a su equipo.
              </p>
            )}
          </div>

          <Link
            href="/login"
            className={`inline-block w-full text-ink font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors duration-150 ${btnClass}`}
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-void px-4 py-10 auth-grid-bg">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.35em] text-brand/60 uppercase mb-4">
            bodysense.fit
          </span>
          <h1 className="text-5xl font-black tracking-[0.18em] text-ink mb-1">
            BODY<span className="text-brand">SENSE</span>
          </h1>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-brand to-transparent opacity-60" />
          <p className="mt-4 text-[13px] text-ink-soft tracking-wide">Crear cuenta nueva</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-surface backdrop-blur-sm p-8 shadow-xl shadow-brand-dark/10">
          <form onSubmit={handleRegister} className="flex flex-col gap-5">

            {/* ── 1. Rol principal ── */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                Rol principal
              </p>
              <div className="flex gap-3">
                <RoleCard
                  active={role === "professional"}
                  onClick={() => { setRole("professional"); setDualMode(false); }}
                  emoji="🏥"
                  title="Soy Profesional"
                  description="Gestiona equipos y monitorea atletas."
                  accentColor="indigo"
                />
                <RoleCard
                  active={role === "athlete"}
                  onClick={() => { setRole("athlete"); setDualMode(false); }}
                  emoji="🏃"
                  title="Soy Atleta"
                  description="Registra sesiones y ve tus métricas."
                  accentColor="emerald"
                />
              </div>
            </div>

            {/* ── 2. Perfil Dual ── */}
            <div className={`rounded-xl border px-4 py-3.5 transition-all duration-200 ${
              dualMode
                ? "border-brand/40 bg-brand/[0.06]"
                : "border-line bg-surface"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">⚡</span>
                    <p className={`text-sm font-semibold transition-colors ${
                      dualMode ? "text-ink" : "text-ink-soft"
                    }`}>
                      Perfil Dual
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/20 text-brand font-bold uppercase tracking-wider">
                      opcional
                    </span>
                  </div>
                  <p className="text-ink-soft text-xs leading-relaxed">
                    {isAthlete
                      ? "Activa también el dashboard de Profesional para gestionar atletas."
                      : "Activa también la Vista Atleta para registrar tus propias sesiones."}
                  </p>

                  {/* Chips de acceso — solo cuando activado */}
                  {dualMode && (
                    <div className="flex gap-2 flex-wrap mt-2.5">
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/30">
                        🏥 Dashboard Profesional
                      </span>
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/40">
                        🏃 Vista Atleta
                      </span>
                    </div>
                  )}
                </div>

                <Toggle on={dualMode} onToggle={() => setDualMode((v) => !v)} />
              </div>
            </div>

            {/* ── 3. Nombre ── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                placeholder={isAthlete ? "Ej. Juan Pablo García" : "Ej. Carlos Mendoza"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-surface-high border border-line rounded-lg px-4 py-3 text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200"
              />
            </div>

            {/* ── 4. Email ── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="hola@bodysense.fit"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-surface-high border border-line rounded-lg px-4 py-3 text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200"
              />
            </div>

            {/* ── 5. Contraseña ── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="bg-surface-high border border-line rounded-lg px-4 py-3 text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200"
              />
            </div>

            {/* ── 6. Deporte (atleta o dual) ── */}
            {needsSport && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sport" className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                  Tu deporte
                </label>
                <select
                  id="sport"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="bg-surface-high border border-line rounded-lg px-4 py-3 text-ink text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-200 appearance-none"
                >
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-surface">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-danger/10 border border-danger/40 rounded-lg px-4 py-3">
                <span className="text-danger text-base mt-0.5 shrink-0">⚠</span>
                <p className="text-danger text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`mt-1 w-full text-ink font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 ${btnClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-line-strong border-t-white animate-spin" />
                  Creando cuenta…
                </span>
              ) : (
                `Crear Cuenta ${dualMode ? "Dual" : isAthlete ? "de Atleta" : "Profesional"}`
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[13px] text-ink-muted mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-brand hover:text-brand transition-colors duration-150 font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
