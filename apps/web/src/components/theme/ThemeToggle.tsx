"use client";

/**
 * ThemeToggle — selector de tema cálido ↔ oscuro.
 *
 * El tema se aplica como `data-theme` en <html>. El valor inicial ya lo
 * fija el script inline de layout.tsx (antes del primer paint), así que
 * aquí solo leemos el estado real del DOM para sincronizar el icono.
 */

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { springPop } from "@/components/motion/primitives";

export type Theme = "warm" | "dark";

const STORAGE_KEY = "bs-theme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("warm");
  const [mounted, setMounted] = useState(false);

  // Sincroniza con lo que el script inline ya aplicó (evita mismatch SSR).
  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "warm";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "warm" ? "dark" : "warm";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage puede fallar en modo privado — el tema igual se aplica.
    }
  }

  // Hasta montar, renderiza un hueco del mismo tamaño (sin parpadeo de icono).
  if (!mounted) {
    return <div className={compact ? "h-8 w-8" : "h-9 w-9"} aria-hidden />;
  }

  const isWarm = theme === "warm";
  const label = isWarm ? "Cambiar a tema oscuro" : "Cambiar a tema cálido";

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      transition={springPop}
      aria-label={label}
      title={label}
      className={[
        compact ? "h-8 w-8" : "h-9 w-9",
        "inline-flex items-center justify-center rounded-lg",
        "border border-line bg-surface-high text-ink-soft",
        "transition-colors duration-200",
        "hover:border-brand/50 hover:text-brand",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      ].join(" ")}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={springPop}
        className="inline-flex"
      >
        {isWarm ? <Moon size={15} /> : <Sun size={15} />}
      </motion.span>
    </motion.button>
  );
}
