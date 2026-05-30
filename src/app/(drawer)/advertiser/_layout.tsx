import React from "react";
import { Stack } from "expo-router";

export default function AdvertiserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[campaignId]" />
    </Stack>
  );
}
