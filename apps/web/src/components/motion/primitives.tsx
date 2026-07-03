"use client";

/**
 * Primitivas de animación compartidas (framer-motion).
 *
 * Filosofía: sutil y profesional. Duraciones 0.2–0.4s, easeOut.
 * - staggerContainer + fadeUpItem → carga en cascada de tarjetas
 * - springPop → transiciones elásticas desaturadas para toggles/valores
 */

import type { Variants, Transition } from "framer-motion";

/** Contenedor que secuencia la entrada de sus hijos (0.05s entre cada uno). */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/** Item: fade + desplazamiento suave hacia arriba (y: 20 → 0). */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, // easeOut suave
  },
};

/** Spring desaturado para "pop" de escala en toggles/selectores. */
export const springPop: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 26,
  mass: 0.6,
};

/** Transición de altura fluida para contenedores colapsables. */
export const collapse: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
};
