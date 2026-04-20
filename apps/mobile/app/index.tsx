import { Redirect } from "expo-router";
import { useAuthStore } from "../store/auth.store";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "professional") {
    return <Redirect href="/(professional)/(tabs)" />;
  }

  return <Redirect href="/(athlete)/(tabs)" />;
}
