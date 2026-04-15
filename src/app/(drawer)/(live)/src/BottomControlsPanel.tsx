import React from "react";
import { View, StyleSheet } from "react-native";
import { GoLiveButton } from "./GoLiveButton";
import { ToggleMicButton } from "./ToggleMicButton";
import { ToggleLiveButton } from "./ToggleLiveButton";

type Props = {
  isLive: boolean;
  onGoLivePress?: () => void;
};

export const BottomControlsPanel = ({ isLive, onGoLivePress }: Props) => {
  return (
    <View style={styles.container}>
      {/* Mic Button */}
      <ToggleMicButton />

      {/* Toggle Live Button */}
      <ToggleLiveButton />

      {/* Go Live / secondary action button */}
      <GoLiveButton isLive={isLive} onPress={onGoLivePress ?? (() => {})} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
  },
});
