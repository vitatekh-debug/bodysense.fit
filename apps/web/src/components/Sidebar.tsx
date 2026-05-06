"use client";

/**
 * Sidebar — Bodysense
 *
 * Comportamiento:
 *
 * Móvil (< 1024 px):
 *   • Sheet: position fixed, full height, z-40
 *   • Cerrado  → translateX(-100%) — fuera de pantalla
 *   • Abierto  → translateX(0)     — animación 300 ms ease
 *   • Ancho 288 px (w-72) — touch targets amplios
 *   • Botón × para cerrar en la cabecera
 *   • will-change-transform activa la GPU en móvil
 *
 * Desktop (≥ 1024 px):
 *   • lg:static — entra en el flujo flex del DashboardShell
 *   • Siempre visible, lg:translate-x-0, lg:w-60
 *   • Botón × oculto (lg:hidden)
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
        // ── Base — siempre ──────────────────────────────────────
        "flex flex-col bg-[#0a0a0a] border-r border-slate-800/80",

        // ── Móvil: Sheet fuera del flujo, desliza desde izquierda ──
        "fixed inset-y-0 left-0 z-40 w-72",
        "transition-transform duration-300 ease-in-out will-change-transform",
        isOpen ? "translate-x-0" : "-translate-x-full",

        // ── Desktop: entra al flujo flex, siempre visible ──────
        "lg:static lg:inset-y-auto lg:left-auto lg:z-auto",
        "lg:translate-x-0 lg:w-60 lg:flex-shrink-0",
      )}
      aria-label="Navegación principal"
    >
      {/* ── Logo + botón cerrar ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/80 flex-shrink-0">
        <span className="text-lg font-black tracking-[0.15em] select-none">
          <span className="text-[#818cf8]">BODY</span>
          <span className="text-slate-100">SENSE</span>
        </span>

        {/* Botón × — sólo en móvil */}
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            "text-slate-500 hover:text-slate-200",
            "border border-white/[0.07] hover:border-white/[0.15]",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "transition-all duration-150",
            "lg:hidden",
          )}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Menú principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40",
                active
                  ? "bg-[#818cf8]/12 text-[#818cf8] border border-[#818cf8]/20"
                  : "text-slate-400 border border-transparent hover:bg-white/[0.04] hover:text-slate-200",
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
      <div className="px-3 pb-5 flex-shrink-0 border-t border-slate-800/60 pt-3">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full",
            "px-3 py-2.5 rounded-xl text-sm font-medium",
            "text-slate-500 border border-transparent",
            "hover:text-red-400 hover:bg-red-950/30 hover:border-red-900/30",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30",
          )}
        >
          <LogOut size={17} className="shrink-0" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
