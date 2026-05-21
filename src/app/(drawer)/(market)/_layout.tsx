
import React from "react";
import { Stack } from "expo-router";

export default function MarketLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="sell-form" />
      <Stack.Screen name="seller-dashboard" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
