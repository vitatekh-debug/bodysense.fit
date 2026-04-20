import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import type { UserRole } from "@vitatekh/shared";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("professional");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error al registrarse", error.message);
      return;
    }

    // Profile is created automatically via Supabase trigger
    Alert.alert("¡Registro exitoso!", "Revisa tu correo para confirmar la cuenta.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Crear Cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#64748B"
        value={fullName}
        onChangeText={setFullName}
      />
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
        placeholder="Contraseña (mín. 8 caracteres)"
        placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Soy un...</Text>
      <View style={styles.roleRow}>
        {(["professional", "athlete"] as UserRole[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleOption, role === r && styles.roleOptionActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r === "professional" ? "Profesional" : "Deportista"}
            </Text>
            <Text style={styles.roleDesc}>
              {r === "professional"
                ? "Fisioterapeuta, entrenador"
                : "Atleta en formación"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Registrando..." : "Crear Cuenta"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner: { padding: 28, gap: 16, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: "#F1F5F9", marginBottom: 8 },
  label: { color: "#94A3B8", fontSize: 14, marginTop: 8 },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    color: "#F1F5F9",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  roleRow: { flexDirection: "row", gap: 12 },
  roleOption: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#334155",
  },
  roleOptionActive: { borderColor: "#6366F1", backgroundColor: "#1E1B4B" },
  roleText: { color: "#94A3B8", fontWeight: "700", fontSize: 14 },
  roleTextActive: { color: "#818CF8" },
  roleDesc: { color: "#475569", fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#6366F1", textAlign: "center", marginTop: 8 },
});
