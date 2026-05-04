import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bodysense — Gestión de Carga Deportiva",
  description: "Monitoreo de carga de entrenamiento y prevención de lesiones en deportistas | bodysense.fit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
