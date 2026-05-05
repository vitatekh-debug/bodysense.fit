"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    /* ── Industrial Dark background ── */
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
          {/* neon underline */}
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#818cf8] to-transparent opacity-60" />
          <p className="mt-4 text-[13px] text-slate-500 tracking-wide">
            Gestión de Carga Deportiva
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm p-8 shadow-xl shadow-black/60">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email field */}
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

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase"
                >
                  Contraseña
                </label>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
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
                autoComplete="current-password"
              />
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
                  Ingresando…
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ── */}
        <p className="text-center text-[13px] text-slate-600 mt-6">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-[#818cf8] hover:text-[#6366F1] transition-colors duration-150 font-medium"
          >
            Crear cuenta de profesional
          </Link>
        </p>
      </div>
    </div>
  );
}
