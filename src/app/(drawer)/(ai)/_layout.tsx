import { Stack, router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export default function AiLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
          color: theme.text,
        },
        headerShadowVisible: !isDark,
        contentStyle: { backgroundColor: theme.background },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingHorizontal: 8 }}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
        headerRight: () => null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Broadcast AI",
        }}
      />
    </Stack>
  );
}
