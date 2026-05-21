import { Stack } from "expo-router";

export default function StatusStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000" },
        animation: "fade",
        gestureEnabled: true,
      }}
    />
  );
}
