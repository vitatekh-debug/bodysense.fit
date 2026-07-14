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
    <div className="min-h-screen flex items-center justify-center bg-void px-4 auth-grid-bg">

      <div className="w-full max-w-sm">

        {/* ── Brand mark ── */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.35em] text-brand/70 uppercase mb-4">
            bodysense.fit
          </span>
          <h1 className="text-5xl font-black tracking-[0.18em] text-ink mb-1">
            BODY<span className="text-brand">SENSE</span>
          </h1>
          {/* subrayado terracota */}
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-brand to-transparent opacity-70" />
          <p className="mt-4 text-[13px] text-ink-soft tracking-wide">
            Gestión de Carga Deportiva
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-lg shadow-brand-dark/10">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase"
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
                  bg-surface-high border border-line rounded-lg
                  px-4 py-3 text-ink text-sm
                  placeholder-ink-muted
                  focus:outline-none focus:border-brand
                  focus:ring-2 focus:ring-brand/20
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
                  className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase"
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
                  bg-surface-high border border-line rounded-lg
                  px-4 py-3 text-ink text-sm
                  placeholder-ink-muted
                  focus:outline-none focus:border-brand
                  focus:ring-2 focus:ring-brand/20
                  transition-all duration-200
                "
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error banner */}
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
              className="
                mt-1 w-full
                bg-brand hover:bg-brand-dark active:bg-brand-deep
                text-on-brand font-bold text-sm tracking-wide
                py-3.5 rounded-lg
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40
              "
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-line-strong border-t-white animate-spin" />
                  Ingresando…
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        {/* ── Footer link ── */}
        <p className="text-center text-[13px] text-ink-soft mt-6">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-brand hover:text-brand-dark transition-colors duration-150 font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
