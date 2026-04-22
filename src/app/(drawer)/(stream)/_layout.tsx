import { View, Text } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import ChatWrapper from "@/app/components/ChatWrapper";
import VideoProvider from "@/app/components/VideoProvider";
import { useLevel } from "@/context/LevelContext";

export default function stream_layout() {
  const { userDetails } = useLevel();
  return (
    <ChatWrapper userDetail={userDetails!}>
      <VideoProvider userDetail={userDetails!}>
        <Stack screenOptions={{ headerShown: false }} />
      </VideoProvider>
    </ChatWrapper>
  );
}
