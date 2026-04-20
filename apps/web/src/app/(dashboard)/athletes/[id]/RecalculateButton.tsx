"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  athleteId: string;
}

export default function RecalculateButton({ athleteId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRecalculate() {
    setLoading(true);
    setDone(false);
    try {
      const supabase = createClient();
      await supabase.functions.invoke("calculate-acwr", {
        body: { athlete_id: athleteId },
      });
      setDone(true);
      // Refresh the page to show new data
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Error recalculating ACWR:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand/20 border border-brand/40 text-brand-light text-sm font-medium hover:bg-brand/30 transition disabled:opacity-50"
    >
      <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
      {loading ? "Calculando..." : done ? "¡Listo!" : "Recalcular ACWR"}
    </button>
  );
}
