export * from "./acwr";
export * from "./smcp";
export * from "./prescription";

/** Formats a date string to DD/MM/YYYY */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Returns initials from a full name. "Juan Pérez" → "JP" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Maps sport key to display label */
export const SPORT_LABELS: Record<string, string> = {
  basketball: "Baloncesto",
  football: "Fútbol",
  volleyball: "Voleibol",
};

/** Maps RPE value to descriptive label (Borg 6-20) */
export function getRpeLabel(rpe: number): string {
  if (rpe <= 7)  return "Muy Fácil";
  if (rpe <= 9)  return "Fácil";
  if (rpe <= 11) return "Moderado";
  if (rpe <= 13) return "Algo Difícil";
  if (rpe <= 15) return "Difícil";
  if (rpe <= 17) return "Muy Difícil";
  return "Máximo";
}
