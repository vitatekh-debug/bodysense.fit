import { View, Text, StyleSheet } from "react-native";

// TODO (Fase 5): Planificador de temporada — micro/meso/macrociclos.
// Soporta modelo clásico y periodización táctica (fútbol).
export default function PeriodizationTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Periodización — Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  text: { color: "#64748B", fontSize: 16 },
});
