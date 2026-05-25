
import React from "react";
import { Stack } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import ChatWrapper from "@/components/ChatWrapper";

export default function MarketLayout() {
  const { userDetails } = useLevel();

  return (
    <ChatWrapper userDetail={userDetails}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="sell-form" />
        <Stack.Screen name="seller-dashboard" />
        <Stack.Screen name="search" />
      </Stack>
    </ChatWrapper>
  );
}
