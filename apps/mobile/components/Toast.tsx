/**
 * Toast — Lightweight in-app notification system for Vitatekh Mobile
 *
 * Usage:
 *   import { useToast, ToastContainer } from "@/components/Toast";
 *
 *   // In your root layout:
 *   <ToastContainer />
 *
 *   // In any component:
 *   const toast = useToast();
 *   toast.success("¡Check-in guardado!");
 *   toast.error("No se pudo guardar. Revisa tu conexión.");
 *   toast.warning("Revisa tu ACWR antes de entrenar.");
 *   toast.info("Datos sincronizados correctamente.");
 */

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  subtitle?: string;
  duration?: number; // ms, default 3500
}

interface ToastContextValue {
  success:  (msg: string, subtitle?: string) => void;
  error:    (msg: string, subtitle?: string) => void;
  warning:  (msg: string, subtitle?: string) => void;
  info:     (msg: string, subtitle?: string) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: string; label: string }> = {
  success: { bg: "#0F2117", border: "#166534", icon: "✅", label: "Éxito" },
  error:   { bg: "#1C0A0A", border: "#991B1B", icon: "❌", label: "Error" },
  warning: { bg: "#1C1204", border: "#92400E", icon: "⚠️", label: "Atención" },
  info:    { bg: "#0C1A2E", border: "#1D4ED8", icon: "ℹ️",  label: "Info" },
};

const TEXT_COLOR: Record<ToastType, string> = {
  success: "#4ADE80",
  error:   "#FCA5A5",
  warning: "#FCD34D",
  info:    "#93C5FD",
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error:   () => {},
  warning: () => {},
  info:    () => {},
});

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const cfg = TOAST_CONFIG[toast.type];
  const textColor = TEXT_COLOR[toast.type];
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 180,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id));
    }, toast.duration ?? 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastInner}
        onPress={() => onDismiss(toast.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.toastIcon}>{cfg.icon}</Text>
        <View style={styles.toastText}>
          <Text style={[styles.toastMessage, { color: textColor }]} numberOfLines={2}>
            {toast.message}
          </Text>
          {toast.subtitle && (
            <Text style={styles.toastSubtitle} numberOfLines={1}>
              {toast.subtitle}
            </Text>
          )}
        </View>
        <Text style={[styles.toastDismiss, { color: textColor + "88" }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider + Container ─────────────────────────────────────────────────────

let _addToast: ((t: Omit<ToastMessage, "id">) => void) | null = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const add = useCallback((t: Omit<ToastMessage, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]); // max 3 visible
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Expose globally so imperative calls work outside React tree
  _addToast = add;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={remove} />
      ))}
    </View>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const show = useCallback(
    (type: ToastType, message: string, subtitle?: string, duration?: number) => {
      if (_addToast) {
        _addToast({ type, message, subtitle, duration });
      }
    },
    []
  );

  return {
    success: (msg, sub) => show("success", msg, sub),
    error:   (msg, sub) => show("error",   msg, sub),
    warning: (msg, sub) => show("warning", msg, sub),
    info:    (msg, sub) => show("info",    msg, sub),
  };
}

/** Imperative API — use when outside a React component */
export const toast = {
  success: (msg: string, subtitle?: string) => _addToast?.({ type: "success", message: msg, subtitle }),
  error:   (msg: string, subtitle?: string) => _addToast?.({ type: "error",   message: msg, subtitle }),
  warning: (msg: string, subtitle?: string) => _addToast?.({ type: "warning", message: msg, subtitle }),
  info:    (msg: string, subtitle?: string) => _addToast?.({ type: "info",    message: msg, subtitle }),
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toastItem: {
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  toastIcon:     { fontSize: 20 },
  toastText:     { flex: 1 },
  toastMessage:  { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  toastSubtitle: { color: "#64748B", fontSize: 12, marginTop: 2 },
  toastDismiss:  { fontSize: 16, fontWeight: "700" },
});
