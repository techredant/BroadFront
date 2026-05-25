import React from "react";
import { View, StyleSheet } from "react-native";
import { GoLiveButton } from "./GoLiveButton";
import { ToggleMicButton } from "./ToggleMicButton";
import { ToggleLiveButton } from "./ToggleLiveButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  isLive: boolean;
  onGoLivePress?: () => void;
};

export const BottomControlsPanel = ({ isLive, onGoLivePress }: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom + 12, 24),
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      {/* Mic Button */}
      <ToggleMicButton />

      {/* Toggle Live Button */}
      <ToggleLiveButton />

      {/* Go Live / secondary action button */}
      <GoLiveButton isLive={isLive} onPress={onGoLivePress ?? (() => {})} />
    </View>
  );
};
