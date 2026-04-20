import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth.store";
import { ToastContainer } from "../components/Toast";
import { flushQueue } from "../lib/offline-queue";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setSession, loadProfile, profile } = useAuthStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // ── Auth state ───────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          await loadProfile();
        }
        SplashScreen.hideAsync();
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile().then(() => SplashScreen.hideAsync());
      } else {
        SplashScreen.hideAsync();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Offline queue flush on app foreground ──────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        profile?.id
      ) {
        // App came to foreground — try to flush any queued offline data
        flushQueue(profile.id).catch(() => {});
      }
      appState.current = nextState;
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [profile?.id]);

  // ── Initial flush on mount (if already logged in) ──────────────
  useEffect(() => {
    if (profile?.id) {
      flushQueue(profile.id).catch(() => {});
    }
  }, [profile?.id]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(professional)" />
        <Stack.Screen name="(athlete)" />
      </Stack>
      {/* Global Toast overlay — renders above all screens */}
      <ToastContainer />
    </View>
  );
}
