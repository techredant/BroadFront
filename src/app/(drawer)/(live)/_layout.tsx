import { View, Text } from "react-native";
import React from "react";
import { Slot, Stack } from "expo-router";

export default function LiveLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
