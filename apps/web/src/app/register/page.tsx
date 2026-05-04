"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
          role: "professional",      // web register = always professional
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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-black text-slate-100">¡Cuenta creada!</h2>
          <p className="text-slate-400 text-sm">
            Revisa tu correo para confirmar la cuenta,<br />
            luego inicia sesión.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 bg-brand text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-dark transition"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-brand text-center tracking-widest mb-2">
          BODYSENSE
        </h1>
        <p className="text-center text-slate-400 text-sm mb-10">
          Crear cuenta de Profesional Deportivo
        </p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-surface rounded-xl px-4 py-3 text-slate-100 border border-slate-700 focus:outline-none focus:border-brand placeholder-slate-500"
            required
          />
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
            placeholder="Contraseña (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface rounded-xl px-4 py-3 text-slate-100 border border-slate-700 focus:outline-none focus:border-brand placeholder-slate-500"
            required
            autoComplete="new-password"
          />

          {/* Role info */}
          <div className="bg-surface rounded-xl px-4 py-3 border border-slate-700 flex gap-3 items-start">
            <span className="text-brand text-lg mt-0.5">🏥</span>
            <div>
              <p className="text-slate-200 text-sm font-semibold">Cuenta Profesional</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Fisioterapeuta, entrenador o preparador físico. Podrás gestionar equipos y atletas.
              </p>
            </div>
          </div>

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
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-brand hover:text-brand-light transition">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
