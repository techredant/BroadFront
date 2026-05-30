import { Stack } from "expo-router";

/** Audio rooms use the app-wide StreamVideo provider from _layout.tsx. */
export default function AudioLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
