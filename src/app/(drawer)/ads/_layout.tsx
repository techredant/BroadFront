import React from "react";
import { Stack } from "expo-router";

export default function AdsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
