import React from "react";
import { Stack } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import ChatWrapper from "@/components/ChatWrapper";

export default function StreamLayout() {
  const { userDetails } = useLevel();

  return (
    <ChatWrapper userDetail={userDetails}>
      <Stack screenOptions={{ headerShown: false }} />
    </ChatWrapper>
  );
}
