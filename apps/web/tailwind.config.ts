import type { Config } from "tailwindcss";

/**
 * Paleta semántica de Bodysense.
 *
 * Cada color apunta a una variable CSS declarada en globals.css como
 * canales RGB. El patrón `rgb(var(--x) / <alpha-value>)` es lo que
 * permite usar opacidades de Tailwind (bg-brand/15, border-line/50).
 *
 * Cambiar de tema no toca estas clases: solo se reasignan los canales
 * en :root[data-theme="..."].
 */
const token = (name: string) => `rgb(var(--bs-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Superficies
        void:           token("void"),
        surface:        token("surface"),
        "surface-high": token("surface-high"),
        "surface-top":  token("surface-top"),

        // Bordes
        line:          token("line"),
        "line-strong": token("line-strong"),

        // Texto
        ink:          token("ink"),
        "ink-body":   token("ink-body"),
        "ink-soft":   token("ink-soft"),
        "ink-muted":  token("ink-muted"),

        // Marca
        brand: {
          DEFAULT: token("brand"),
          light:   token("brand-light"),
          dark:    token("brand-dark"),
          deep:    token("brand-deep"),
        },
        "on-brand": token("on-brand"),

        // Semánticos
        success:        token("success"),
        "success-dark": token("success-dark"),
        danger:         token("danger"),
        warning:        token("warning"),
        info:           token("info"),
        "amber-text":   token("amber-text"),
        orange:         token("orange"),
        cyan:           token("cyan"),
        teal:           token("teal"),
        mint:           token("mint"),
        purple:         token("purple"),
      },
    },
  },
  plugins: [],
};

export default config;
