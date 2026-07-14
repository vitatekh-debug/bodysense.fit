/**
 * atleta/layout.tsx — Layout protegido para la vista de atleta
 *
 * Requisito: el usuario debe estar autenticado.
 * No exige role='athlete' para permitir el modo dual del dueño.
 *
 * Header minimalista con:
 *  - Logo/título
 *  - Nombre del usuario
 *  - Botón "Volver al Dashboard" (solo si tiene rol profesional)
 *  - Cerrar sesión
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Leer perfil para saber si es profesional (modo dual) o atleta puro
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const dualMode       = user.user_metadata?.dual_mode === true;
  const showBackLink   = profile?.role === "professional" || dualMode;
  const displayName    = profile?.full_name || user.email || "Atleta";

  return (
    <div className="min-h-dvh flex flex-col bg-surface">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 h-14 px-4 sm:px-6 border-b border-line bg-surface">

        {/* Logo */}
        <span className="text-sm font-black tracking-[0.15em] select-none">
          <span className="text-brand">BODY</span>
          <span className="text-ink">SENSE</span>
        </span>

        {/* Badge vista */}
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/40">
          Vista Atleta
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nombre */}
        <span className="text-ink-soft text-xs hidden sm:block truncate max-w-[160px]">
          {displayName}
        </span>

        {/* Selector de tema */}
        <ThemeToggle compact />

        {/* Volver al Dashboard profesional (solo modo dual o role professional) */}
        {showBackLink && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-high/50 text-ink-soft text-xs font-medium hover:border-line-strong hover:text-ink transition-all duration-150"
          >
            ← Dashboard
          </Link>
        )}
      </header>

      {/* ── Contenido ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
