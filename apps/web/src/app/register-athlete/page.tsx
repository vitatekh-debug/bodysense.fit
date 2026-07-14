"use client";

/**
 * /register-athlete — Registro público para atletas
 *
 * Flujo:
 *  1. El atleta introduce nombre, correo, contraseña y deporte.
 *  2. signUp() crea el usuario con role="athlete" en raw_user_meta_data.
 *  3. El trigger handle_new_user() crea automáticamente la fila en profiles.
 *  4. El profesional vincula al atleta a su equipo desde la app o con SQL.
 *
 * Nota: esta ruta es pública (no requiere sesión). El middleware
 * fue corregido para no redirigir /register-athlete a /dashboard.
 */

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Deportes disponibles ─────────────────────────────────────────────────────

const SPORTS = [
  { value: "football",   label: "⚽  Fútbol" },
  { value: "basketball", label: "🏀  Baloncesto" },
  { value: "volleyball", label: "🏐  Voleibol" },
] as const;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RegisterAthletePage() {
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [sport,     setSport]     = useState<string>("football");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

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
          full_name: fullName,
          role:      "athlete",
          sport,
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

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1e6d4] px-4 auth-grid-bg">
        <div className="w-full max-w-sm text-center rounded-2xl border border-[#e4d8c4] bg-[#fdf9f2] p-10 shadow-xl shadow-[#a8472a]/10">
          <div className="text-5xl mb-6">✅</div>
          <h2 className="text-2xl font-black text-[#3a2c1e] mb-3">¡Cuenta creada!</h2>
          <p className="text-[#8a7660] text-sm leading-relaxed mb-6">
            Revisa tu correo para confirmar la cuenta.<br />
            Después podrás iniciar sesión en la app móvil y registrar tus datos.
          </p>
          {/* Next steps hint */}
          <div className="bg-[#c65f3f]/10 border border-[#c65f3f]/30 rounded-xl px-4 py-3 text-left mb-8 space-y-1.5">
            <p className="text-[#c65f3f] text-xs font-bold uppercase tracking-wider mb-2">¿Qué sigue?</p>
            <p className="text-[#8a7660] text-xs">1. Confirma tu correo (revisa spam).</p>
            <p className="text-[#8a7660] text-xs">2. Tu entrenador te vinculará a su equipo.</p>
            <p className="text-[#8a7660] text-xs">3. Inicia sesión en la app móvil y registra tu primera sesión.</p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full bg-[#c65f3f] hover:bg-[#a8472a] active:bg-[#8f3c23] text-[#3a2c1e] font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors duration-150"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1e6d4] px-4 auth-grid-bg">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.35em] text-[#c65f3f]/60 uppercase mb-4">
            bodysense.fit
          </span>
          <h1 className="text-5xl font-black tracking-[0.18em] text-[#3a2c1e] mb-1">
            BODY<span className="text-[#c65f3f]">SENSE</span>
          </h1>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#c65f3f] to-transparent opacity-60" />
          <p className="mt-4 text-[13px] text-[#8a7660] tracking-wide">
            Crear cuenta de Atleta
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#e4d8c4] bg-[#fdf9f2] backdrop-blur-sm p-8 shadow-xl shadow-[#a8472a]/10">
          <form onSubmit={handleRegister} className="flex flex-col gap-5">

            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fullName"
                className="text-[11px] font-semibold tracking-[0.12em] text-[#8a7660] uppercase"
              >
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Ej. Juan Pablo García"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-[#f7efe2] border border-[#e4d8c4] rounded-lg px-4 py-3 text-[#3a2c1e] text-sm placeholder-[#b0a08c] focus:outline-none focus:border-[#c65f3f] focus:ring-2 focus:ring-[#c65f3f]/20 transition-all duration-200"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-[0.12em] text-[#8a7660] uppercase"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="atleta@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-[#f7efe2] border border-[#e4d8c4] rounded-lg px-4 py-3 text-[#3a2c1e] text-sm placeholder-[#b0a08c] focus:outline-none focus:border-[#c65f3f] focus:ring-2 focus:ring-[#c65f3f]/20 transition-all duration-200"
              />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-[0.12em] text-[#8a7660] uppercase"
              >
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
                className="bg-[#f7efe2] border border-[#e4d8c4] rounded-lg px-4 py-3 text-[#3a2c1e] text-sm placeholder-[#b0a08c] focus:outline-none focus:border-[#c65f3f] focus:ring-2 focus:ring-[#c65f3f]/20 transition-all duration-200"
              />
            </div>

            {/* Deporte */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sport"
                className="text-[11px] font-semibold tracking-[0.12em] text-[#8a7660] uppercase"
              >
                Deporte
              </label>
              <select
                id="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="bg-[#f7efe2] border border-[#e4d8c4] rounded-lg px-4 py-3 text-[#3a2c1e] text-sm focus:outline-none focus:border-[#c65f3f] focus:ring-2 focus:ring-[#c65f3f]/20 transition-all duration-200 appearance-none"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#fdf9f2]">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Role info chip */}
            <div className="flex gap-3 items-start rounded-lg border border-[#6f9c4a]/30 bg-[#6f9c4a]/10 px-4 py-3">
              <span className="text-[#6f9c4a] text-base mt-0.5 shrink-0">🏃</span>
              <div>
                <p className="text-[#3a2c1e] text-sm font-semibold">Cuenta Atleta</p>
                <p className="text-[#8a7660] text-xs mt-0.5 leading-relaxed">
                  Podrás registrar sesiones, bienestar y datos físicos.<br />
                  Tu entrenador verá tus métricas en tiempo real.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-[#c0492f]/10 border border-[#c0492f]/40 rounded-lg px-4 py-3">
                <span className="text-[#c0492f] text-base mt-0.5 shrink-0">⚠</span>
                <p className="text-[#c0492f] text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-[#6f9c4a] hover:bg-[#6f9c4a] active:bg-[#5a8039] text-[#3a2c1e] font-bold text-sm tracking-wide py-3.5 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f9c4a]/50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#d6c6ac] border-t-white animate-spin" />
                  Creando cuenta…
                </span>
              ) : (
                "Crear Cuenta de Atleta"
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-[13px] text-[#b0a08c]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#c65f3f] hover:text-[#c65f3f] transition-colors duration-150 font-medium">
              Iniciar sesión
            </Link>
          </p>
          <p className="text-[13px] text-[#b0a08c]">
            ¿Eres profesional?{" "}
            <Link href="/register" className="text-[#c65f3f] hover:text-[#c65f3f] transition-colors duration-150 font-medium">
              Crear cuenta profesional
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
