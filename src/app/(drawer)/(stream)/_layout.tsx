import { View, Text } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import VideoProvider from "@/app/components/VideoProvider";
import { useLevel } from "@/context/LevelContext";

export default function stream_layout() {
  const { userDetails } = useLevel();

  return (
    <VideoProvider userDetail={userDetails!}>
      <Stack screenOptions={{ headerShown: false }} />
    </VideoProvider>
  );
}
