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
    const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
    } else {
      // Leer el rol del perfil para redirigir a la vista correcta
      let destination = "/dashboard"; // default: profesional
      if (loginData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", loginData.user.id)
          .single();
        if (profile?.role === "athlete") {
          destination = "/atleta/dashboard";
        }
      }
      router.push(destination);
      router.refresh();
    }
  }

  return (
    /* ── Fondo cálido crema ── */
    <div className="min-h-screen flex items-center justify-center bg-[#f1e6d4] px-4 auth-grid-bg">

      <div className="w-full max-w-sm">

        {/* ── Brand mark ── */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.35em] text-[#c65f3f]/70 uppercase mb-4">
            bodysense.fit
          </span>
          <h1 className="text-5xl font-black tracking-[0.18em] text-[#3a2c1e] mb-1">
            BODY<span className="text-[#c65f3f]">SENSE</span>
          </h1>
          {/* subrayado terracota */}
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#c65f3f] to-transparent opacity-70" />
          <p className="mt-4 text-[13px] text-[#8a7660] tracking-wide">
            Gestión de Carga Deportiva
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-[#e4d8c4] bg-[#fdf9f2] p-8 shadow-lg shadow-[#a8472a]/10">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email field */}
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
                placeholder="hola@bodysense.fit"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  bg-[#f7efe2] border border-[#e4d8c4] rounded-lg
                  px-4 py-3 text-[#3a2c1e] text-sm
                  placeholder-[#b0a08c]
                  focus:outline-none focus:border-[#c65f3f]
                  focus:ring-2 focus:ring-[#c65f3f]/20
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
                  className="text-[11px] font-semibold tracking-[0.12em] text-[#8a7660] uppercase"
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
                  bg-[#f7efe2] border border-[#e4d8c4] rounded-lg
                  px-4 py-3 text-[#3a2c1e] text-sm
                  placeholder-[#b0a08c]
                  focus:outline-none focus:border-[#c65f3f]
                  focus:ring-2 focus:ring-[#c65f3f]/20
                  transition-all duration-200
                "
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error banner */}
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
              className="
                mt-1 w-full
                bg-[#c65f3f] hover:bg-[#a8472a] active:bg-[#8f3c23]
                text-[#fdf3ea] font-bold text-sm tracking-wide
                py-3.5 rounded-lg
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65f3f]/40
              "
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#d6c6ac] border-t-white animate-spin" />
                  Ingresando…
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ── */}
        <p className="text-center text-[13px] text-[#8a7660] mt-6">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-[#c65f3f] hover:text-[#a8472a] transition-colors duration-150 font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
