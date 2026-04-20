"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <h1 className="text-4xl font-black text-brand text-center tracking-widest mb-2">
          VITATEKH
        </h1>
        <p className="text-center text-slate-400 text-sm mb-10">
          Dashboard de Gestión de Carga Deportiva
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface rounded-xl px-4 py-3 text-slate-100 border border-slate-700 focus:outline-none focus:border-brand placeholder-slate-500"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface rounded-xl px-4 py-3 text-slate-100 border border-slate-700 focus:outline-none focus:border-brand placeholder-slate-500"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl transition disabled:opacity-50 mt-1"
          >
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-slate-500 text-sm mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-brand hover:text-brand-light transition">
            Crear cuenta de profesional
          </Link>
        </p>
      </div>
    </div>
  );
}
