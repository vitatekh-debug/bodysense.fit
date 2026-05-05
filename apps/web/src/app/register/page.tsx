"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "professional",   // web register = always professional
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  }

  /* ── Success state ── */
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4 auth-grid-bg">
        <div className="w-full max-w-sm text-center rounded-2xl border border-white/[0.07] bg-white/[0.025] p-10 shadow-xl shadow-black/60">
          <div className="text-5xl mb-6">✅</div>
          <h2 className="text-2xl font-black text-slate-100 mb-3">¡Cuenta creada!</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Revisa tu correo para confirmar la cuenta,<br />
            luego inicia sesión.
          </p>
          <Link
            href="/login"
            className="
              inline-block w-full
              bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA]
              text-white font-bold text-sm tracking-wide
              py-3.5 rounded-lg
              transition-colors duration-150
            "
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] px-4 auth-grid-bg">
      <div className="w-full max-w-sm">

        {/* ── Brand mark ── */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.35em] text-[#818cf8]/60 uppercase mb-4">
            bodysense.fit
          </span>
          <h1 className="text-5xl font-black tracking-[0.18em] text-white mb-1">
            BODY<span className="text-[#818cf8]">SENSE</span>
          </h1>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#818cf8] to-transparent opacity-60" />
          <p className="mt-4 text-[13px] text-slate-500 tracking-wide">
            Crear cuenta de Profesional Deportivo
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm p-8 shadow-xl shadow-black/60">
          <form onSubmit={handleRegister} className="flex flex-col gap-5">

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fullName"
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase"
              >
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Ej. Carlos Mendoza"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="
                  bg-black/40 border border-white/[0.09] rounded-lg
                  px-4 py-3 text-slate-100 text-sm
                  placeholder-slate-700
                  focus:outline-none focus:border-[#818cf8]
                  focus:ring-2 focus:ring-[#818cf8]/20
                  transition-all duration-200
                "
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="hola@bodysense.fit"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  bg-black/40 border border-white/[0.09] rounded-lg
                  px-4 py-3 text-slate-100 text-sm
                  placeholder-slate-700
                  focus:outline-none focus:border-[#818cf8]
                  focus:ring-2 focus:ring-[#818cf8]/20
                  transition-all duration-200
                "
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  bg-black/40 border border-white/[0.09] rounded-lg
                  px-4 py-3 text-slate-100 text-sm
                  placeholder-slate-700
                  focus:outline-none focus:border-[#818cf8]
                  focus:ring-2 focus:ring-[#818cf8]/20
                  transition-all duration-200
                "
                required
                autoComplete="new-password"
              />
            </div>

            {/* Role info chip */}
            <div className="flex gap-3 items-start rounded-lg border border-[#6366F1]/20 bg-[#6366F1]/[0.06] px-4 py-3">
              <span className="text-[#818cf8] text-base mt-0.5 shrink-0">🏥</span>
              <div>
                <p className="text-slate-200 text-sm font-semibold">Cuenta Profesional</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                  Fisioterapeuta, entrenador o preparador físico.<br />
                  Podrás gestionar equipos y atletas.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3">
                <span className="text-red-400 text-base mt-0.5 shrink-0">⚠</span>
                <p className="text-red-300 text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-1 w-full
                bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA]
                text-white font-bold text-sm tracking-wide
                py-3.5 rounded-lg
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/50
              "
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creando cuenta…
                </span>
              ) : (
                "Crear Cuenta"
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ── */}
        <p className="text-center text-[13px] text-slate-600 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[#818cf8] hover:text-[#6366F1] transition-colors duration-150 font-medium"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
