"use client";

/**
 * Sidebar — Bodysense
 *
 * Navegación lateral responsiva:
 *
 * Móvil (< 1024px):
 *   • position: fixed, full height, z-30
 *   • Oculto: transform translateX(-100%)
 *   • Visible: transform translateX(0) — animación 300ms ease
 *   • Ancho 280px (más amplio para touch targets)
 *   • Botón × para cerrar en la cabecera
 *
 * Desktop (≥ 1024px):
 *   • position: static (en el flujo normal)
 *   • Siempre visible, w-60
 *   • Botón × oculto
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Shield,
  Calendar,
  FileText,
  LogOut,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/athletes",      label: "Atletas",         icon: Users },
  { href: "/load-analysis", label: "Análisis Carga",  icon: BarChart2 },
  { href: "/prevention",    label: "Prevención",      icon: Shield },
  { href: "/periodization", label: "Periodización",   icon: Calendar },
  { href: "/reports",       label: "Informes",         icon: FileText },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen:  boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        // Base — siempre aplicados
        "flex flex-col h-full",
        "bg-[#0c0c0c] border-r border-slate-800/80",

        // ── Móvil: fixed, fuera del flujo, desliza desde la izquierda ──
        "fixed top-0 left-0 bottom-0 z-30",
        "w-[280px]",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",

        // ── Desktop: estático, dentro del flujo, siempre visible ──
        "lg:static lg:z-auto lg:translate-x-0 lg:w-60"
      )}
      aria-label="Navegación principal"
    >
      {/* ── Logo + botón cerrar (móvil) ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 flex-shrink-0">
        <span className="text-xl font-black text-brand tracking-widest select-none">
          BODY<span className="text-[#818cf8]">SENSE</span>
        </span>

        {/* Botón cerrar — sólo visible en móvil */}
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className={cn(
            "flex items-center justify-center",
            "h-8 w-8 rounded-lg",
            "text-slate-500 hover:text-slate-200",
            "border border-white/[0.07] hover:border-white/[0.15]",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "transition-all duration-150",
            "lg:hidden"            // oculto en desktop
          )}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Menú">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // "active" si la ruta comienza con href
          // Excepción: /dashboard no debe activarse en /athletes/[id] etc.
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              // En móvil: cerrar sidebar al navegar (también lo hace el useEffect en DashboardShell)
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-150",
                // Clase de accesibilidad para lectores de pantalla
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40",
                active
                  ? [
                      "bg-[#818cf8]/15 text-[#818cf8]",
                      "border border-[#818cf8]/20",
                    ].join(" ")
                  : [
                      "text-slate-400 border border-transparent",
                      "hover:bg-white/[0.04] hover:text-slate-200",
                    ].join(" ")
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Sign out ── */}
      <div className="px-3 pb-6 flex-shrink-0 border-t border-slate-800/60 pt-3">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full",
            "px-3 py-2.5 rounded-xl text-sm font-medium",
            "text-slate-500 border border-transparent",
            "hover:text-red-400 hover:bg-red-950/30 hover:border-red-900/30",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          )}
        >
          <LogOut size={17} className="shrink-0" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
