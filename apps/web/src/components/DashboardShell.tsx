"use client";

/**
 * DashboardShell — Client Component
 *
 * Manages the responsive layout state for the dashboard:
 *   • sidebarOpen toggle (móvil)
 *   • Overlay bg-black/50 cuando el sidebar está abierto en móvil
 *   • Header con botón hamburguesa (< lg) y NotificationBell
 *   • Main content con padding responsivo (px-4 móvil → px-8 desktop)
 *
 * layout.tsx es Server Component (auth) y delega el layout aquí.
 */

import { useState, useCallback, useEffect } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";

interface DashboardShellProps {
  children:  React.ReactNode;
  coachId:   string;
}

export default function DashboardShell({ children, coachId }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Cerrar sidebar automáticamente al navegar (en móvil)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Cerrar sidebar con Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, closeSidebar]);

  // Bloquear scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-surface-dark overflow-hidden">

      {/* ── Overlay — sólo en móvil, z-20 (debajo del sidebar z-30) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-800 bg-surface-dark flex-shrink-0">

          {/* Hamburger — sólo en móvil */}
          <button
            onClick={openSidebar}
            aria-label="Abrir menú de navegación"
            aria-expanded={sidebarOpen}
            className={[
              "flex items-center justify-center",
              "h-9 w-9 rounded-lg",
              "text-slate-400 hover:text-slate-200",
              "border border-white/[0.08] hover:border-white/[0.15]",
              "bg-white/[0.03] hover:bg-white/[0.06]",
              "transition-all duration-150",
              "lg:hidden",          // oculto en desktop
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40",
            ].join(" ")}
          >
            <Menu size={18} />
          </button>

          {/* Logo BODYSENSE en móvil (cuando el sidebar está oculto) */}
          <span className="text-base font-black text-brand tracking-widest lg:hidden">
            BODYSENSE
          </span>

          {/* Campana de notificaciones */}
          <div className="ml-auto">
            <NotificationBell coachId={coachId} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
