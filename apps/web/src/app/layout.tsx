import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
