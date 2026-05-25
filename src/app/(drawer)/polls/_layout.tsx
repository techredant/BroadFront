import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function PollsLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: "Create poll" }} />
      <Stack.Screen name="[id]" options={{ title: "Poll" }} />
    </Stack>
  );
}
