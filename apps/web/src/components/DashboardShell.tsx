"use client";

/**
 * DashboardShell — Client Component
 *
 * Estructura responsiva del dashboard:
 *
 *   Móvil (< 1024px):
 *     ┌──────────────────────────────────┐  ← h-dvh
 *     │  Header fijo (h-14)              │  hamburger + logo + bell
 *     ├──────────────────────────────────┤
 *     │  Main (overflow-y-auto)          │  px-4 py-5
 *     └──────────────────────────────────┘
 *     Sidebar = Sheet fixed (z-40) que desliza desde la izquierda
 *     Overlay  = bg-[#3a2c1e]/40 backdrop-blur-sm (z-30) debajo del Sheet
 *
 *   Desktop (≥ 1024px):
 *     ┌──────────┬───────────────────────┐  ← h-dvh
 *     │ Sidebar  │  Header (h-14)        │
 *     │  w-60    ├───────────────────────┤
 *     │ (static) │  Main (overflow-auto) │
 *     └──────────┴───────────────────────┘
 *
 *   Hydration guard:
 *     `mounted` previene mismatches SSR↔client. El overlay
 *     y el sidebar abierto solo se renderizan post-mount.
 */

import { useState, useCallback, useEffect } from "react";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";

// Solo visible para el dueño del sistema (modo dual coach ↔ atleta)
const OWNER_EMAIL = "vitawell25@gmail.com";

interface DashboardShellProps {
  children:   React.ReactNode;
  coachId:    string;
  userEmail?: string;
  dualMode?:  boolean;
}

export default function DashboardShell({ children, coachId, userEmail, dualMode }: DashboardShellProps) {
  const [mounted,     setMounted]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const showAthleteSwitch = dualMode === true || userEmail === OWNER_EMAIL;

  // Marcar montado (solo cliente — jamás SSR)
  useEffect(() => { setMounted(true); }, []);

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Cerrar sidebar al navegar
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Cerrar con Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeSidebar(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, closeSidebar]);

  // Bloquear scroll del body cuando el Sheet está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    /*
     * Viewport Fix (#5):
     *   h-dvh    → usa el viewport real del móvil (excluye barra de dirección)
     *   w-full   → 100% del ancho sin forzar 100vw (evita scroll horizontal)
     *   overflow-hidden → ningún hijo puede desbordarse lateralmente
     */
    <div className="flex h-dvh w-full overflow-hidden bg-[#fdf9f2]">

      {/* ── Overlay Sheet — solo en móvil, solo cuando mounted ── */}
      {mounted && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#3a2c1e]/40 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (Sheet en móvil, columna estática en desktop) ── */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ── Columna principal ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* ── Header fijo (#4) ── */}
        <header className="flex shrink-0 items-center gap-3 h-14 px-4 sm:px-5 lg:px-6 border-b border-[#e4d8c4] bg-[#fdf9f2]">

          {/* Botón hamburguesa — solo móvil (#1) */}
          <button
            onClick={openSidebar}
            aria-label="Abrir menú de navegación"
            aria-expanded={sidebarOpen}
            className="flex items-center justify-center h-9 w-9 shrink-0 rounded-xl border border-[#e4d8c4] bg-[#fdf9f2] text-[#8a7660] hover:text-[#3a2c1e] hover:border-[#d6c6ac] hover:bg-[#f7efe2] transition-all duration-150 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65f3f]/40"
          >
            <Menu size={18} />
          </button>

          {/* Logo — solo móvil */}
          <span className="text-sm font-black tracking-[0.15em] select-none lg:hidden">
            <span className="text-[#c65f3f]">BODY</span>
            <span className="text-[#3a2c1e]">SENSE</span>
          </span>

          {/* Botón dual-mode — para cuentas con modo dual o el dueño */}
          {showAthleteSwitch && (
            <button
              onClick={() => router.push("/atleta/dashboard")}
              title="Cambiar a vista de atleta"
              className="ml-auto flex items-center gap-1.5 h-8 px-3 shrink-0 rounded-lg border border-[#6f9c4a]/40 bg-[#6f9c4a]/10 text-[#6f9c4a] text-xs font-semibold hover:bg-[#6f9c4a]/10 hover:border-[#6f9c4a]/60 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f9c4a]/40"
            >
              <span>🏃</span>
              <span className="hidden sm:inline">Vista Atleta</span>
            </button>
          )}

          {/* Campana — siempre, empujada a la derecha si no hay botón dual */}
          <div className={showAthleteSwitch ? "" : "ml-auto"}>
            <NotificationBell coachId={coachId} />
          </div>
        </header>

        {/* ── Contenido scrolleable (#5 overflow-x-hidden) ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
