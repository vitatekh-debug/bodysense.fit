import type { Metadata, Viewport } from "next";
import "./globals.css";

// ── Build version — expuesto en HTML para cache-busting ───────────────────
// Vercel inyecta VERCEL_GIT_COMMIT_SHA (SHA del commit) en build time.
// Cambia con cada deploy → los navegadores invalidan el caché HTML.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA  ||   // Vercel CI (primario)
  process.env.COMMIT_REF             ||   // Netlify CI (fallback / rollback)
  process.env.NEXT_PUBLIC_BUILD_ID   ||   // override manual
  `dev`;

// ── Fix 1: Viewport meta — crítico para layout móvil correcto ──────────────
// Sin esto el navegador aplica zoom virtual y los media queries no disparan.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Bodysense — Gestión de Carga Deportiva",
    template: "%s · Bodysense",
  },
  description:
    "Plataforma profesional de monitoreo de carga de entrenamiento, ACWR y prevención de lesiones para deportistas de alto rendimiento.",
  metadataBase: new URL("https://bodysense.fit"),
  openGraph: {
    type: "website",
    url: "https://bodysense.fit",
    siteName: "Bodysense",
    title: "Bodysense — Gestión de Carga Deportiva",
    description:
      "Monitorea la carga de entrenamiento de tus atletas en tiempo real. ACWR, bienestar diario y prevención de lesiones basada en evidencia.",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bodysense — Gestión de Carga Deportiva",
    description:
      "Monitorea la carga de entrenamiento de tus atletas en tiempo real.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/*
         * Cache-busting meta — versión del build embebida en el HTML.
         * Cambia con cada deploy (= hash del commit en Netlify).
         * Los navegadores que cachean el HTML ven un valor diferente
         * y vuelven a descargar el bundle completo.
         */}
        <meta name="x-build-id" content={BUILD_ID} />
        {/*
         * Instruye a navegadores y proxies a revalidar el HTML en
         * cada request. Los assets estáticos (_next/static/) se sirven
         * con max-age=31536000 desde Netlify (ver netlify.toml).
         */}
        <meta httpEquiv="Cache-Control" content="no-cache, must-revalidate" />
      </head>
      <body>{children}</body>
    </html>
  );
}
