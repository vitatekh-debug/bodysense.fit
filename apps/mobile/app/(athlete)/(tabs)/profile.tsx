import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuthStore } from "../../../store/auth.store";
import { SPORT_LABELS } from "@vitatekh/shared";

export default function AthleteProfileTab() {
  const { profile, signOut } = useAuthStore();

  function handleSignOut() {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {profile?.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
        </Text>
      </View>
      <Text style={styles.name}>{profile?.full_name}</Text>
      <Text style={styles.role}>Deportista</Text>
      {profile?.sport && (
        <Text style={styles.sport}>{SPORT_LABELS[profile.sport]}</Text>
      )}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#312E81",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  avatarText: { color: "#818CF8", fontWeight: "800", fontSize: 28 },
  name: { color: "#F1F5F9", fontSize: 22, fontWeight: "800" },
  role: { color: "#6366F1", fontSize: 14, marginTop: 4 },
  sport: { color: "#64748B", fontSize: 13, marginTop: 2 },
  signOutBtn: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  signOutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
