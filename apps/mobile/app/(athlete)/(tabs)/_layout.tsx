import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BS } from "../../../lib/theme";

export default function AthleteTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BS.void,            // #080808
          borderTopColor:  BS.borderFaint,     // rgba(255,255,255,0.05)
          borderTopWidth:  1,
        },
        tabBarActiveTintColor:   BS.brandLight,  // #818CF8
        tabBarInactiveTintColor: BS.textDisabled, // #334155
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-load"
        options={{
          title: "Mi Carga",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prevention"
        options={{
          title: "Prevención",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
