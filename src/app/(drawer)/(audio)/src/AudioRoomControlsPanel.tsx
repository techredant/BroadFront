import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ToggleLiveButton } from "./ToggleLiveButton";
import { ToggleMicButton } from "./ToggleMicButton";

export default function AudioRoomControlsPanel() {
  return (
    <View style={styles.container}>
      <ToggleLiveButton />
      <ToggleMicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 2,
    marginHorizontal: 70,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
