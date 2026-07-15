"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  previous_zone?: string;
  current_zone?: string;
  data?: any;
  read_at: string | null;
  created_at: string;
}

const TYPE_EMOJI: Record<string, string> = {
  zone_escalation:   "🟠",
  critical_acwr:     "🔴",
  red_pain:          "🩸",
  poms_overtraining: "🧠",
  hq_risk_detected:  "⚡",
  fms_pain_pattern:  "🦵",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 60)  return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function NotificationBell({ coachId }: { coachId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("coach_notifications")
        .select("*")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data ?? []);
      setLoading(false);
    }

    load();

    // Suscripción en tiempo real a nuevas notificaciones
    const channel = supabase
      .channel("coach_notifications")
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "coach_notifications",
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coachId]);

  function markAllRead() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("coach_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("coach_id", coachId)
        .is("read_at", null);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    });
  }

  async function markOneRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("coach_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-ink-soft hover:text-ink transition rounded-lg hover:bg-surface-top/50"
        title="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center
                           w-4 h-4 text-xs font-black bg-danger text-ink rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-96 bg-surface-high border border-line
                          rounded-xl shadow-2xl z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h3 className="text-ink font-bold text-sm">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-danger/10 text-danger">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={isPending}
                  className="text-xs text-brand hover:text-brand transition"
                >
                  Marcar todo leído
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800">
              {loading ? (
                <p className="text-ink-soft text-sm text-center py-8">Cargando…</p>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-2xl mb-2">🔔</p>
                  <p className="text-ink-soft text-sm">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read_at && markOneRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:bg-surface-high/50 transition ${
                      !n.read_at ? "bg-surface-high/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">
                        {TYPE_EMOJI[n.type] ?? "🔔"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-semibold truncate ${!n.read_at ? "text-ink" : "text-ink-soft"}`}>
                            {n.title}
                          </p>
                          <span className="text-xs text-ink-muted flex-shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-ink-soft text-xs mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {n.previous_zone && n.current_zone && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-top text-ink-soft">
                              {n.previous_zone}
                            </span>
                            <span className="text-ink-muted text-xs">→</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-danger/10 text-danger">
                              {n.current_zone}
                            </span>
                          </div>
                        )}
                      </div>
                      {!n.read_at && (
                        <div className="w-2 h-2 rounded-full bg-brand-light flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
