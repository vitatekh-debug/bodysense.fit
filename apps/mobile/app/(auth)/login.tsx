import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      console.log("[Login] Intentando signIn con:", email.trim());
      console.log("[Login] Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL ?? "⚠ UNDEFINED");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("[Login] Error de Supabase:", error.status, error.message, error);
        setErrorMsg(error.message);
        return;
      }

      console.log("[Login] Sesión obtenida:", data.session?.user?.email);
      // La redirección la maneja onAuthStateChange en _layout.tsx
      // Fallback explícito por si el listener tarda en web
      if (data.session) {
        router.replace("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      console.error("[Login] Excepción no manejada:", err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>VITATEKH</Text>
        <Text style={styles.subtitle}>Gestión de Carga Deportiva</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#6366F1",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    color: "#F1F5F9",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  errorBox: {
    backgroundColor: "#450A0A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#6366F1", textAlign: "center", marginTop: 8, fontSize: 14 },
});
