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
        "flex flex-col bg-surface border-r border-line",

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
      <div className="flex items-center justify-between px-5 py-5 border-b border-line flex-shrink-0">
        <span className="text-lg font-black tracking-[0.15em] select-none">
          <span className="text-brand">BODY</span>
          <span className="text-ink">SENSE</span>
        </span>

        {/* Botón × — sólo en móvil */}
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            "text-ink-soft hover:text-ink",
            "border border-line hover:border-line-strong",
            "bg-surface hover:bg-surface-high",
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                active
                  ? "bg-brand/12 text-brand border border-brand/20"
                  : "text-ink-soft border border-transparent hover:bg-surface hover:text-ink",
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
      <div className="px-3 pb-5 flex-shrink-0 border-t border-line/60 pt-3">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full",
            "px-3 py-2.5 rounded-xl text-sm font-medium",
            "text-ink-soft border border-transparent",
            "hover:text-danger hover:bg-red-950/30 hover:border-red-900/30",
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
