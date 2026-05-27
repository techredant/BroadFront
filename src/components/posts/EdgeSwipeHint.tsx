import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Direction = "up" | "down";

type Props = {
  direction?: Direction;
  visible: boolean;
  canNavigate: boolean;
  gestureProgress?: SharedValue<number>;
};

const MESSAGES: Record<Direction, { text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  up: { text: "Swipe up for next post", icon: "arrow-up" },
  down: { text: "Swipe down for previous post", icon: "arrow-down" },
};

export const EdgeSwipeHint = ({
  direction,
  visible,
  canNavigate,
  gestureProgress,
}: Props) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (!visible || !direction) {
      opacity.value = withTiming(0, { duration: 180 });
      return;
    }

    opacity.value = withTiming(canNavigate ? 1 : 0.5, { duration: 160 });
    scale.value = withSequence(
      withTiming(1.04, { duration: 120 }),
      withTiming(1, { duration: 120 }),
    );
  }, [canNavigate, direction, opacity, scale, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.max(
      opacity.value,
      gestureProgress
        ? interpolate(
            gestureProgress.value,
            [0, 1],
            [0, canNavigate ? 0.95 : 0.45],
            Extrapolate.CLAMP,
          )
        : 0,
    ),
    transform: [{ scale: scale.value }],
  }));

  if (!direction) return null;
  const message = MESSAGES[direction];

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={[styles.pill, !canNavigate && styles.pillDisabled]}>
        <Ionicons
          name={message.icon}
          size={18}
          color={canNavigate ? "#fff" : "rgba(255,255,255,0.55)"}
        />
        <Text style={[styles.text, !canNavigate && styles.textDisabled]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillDisabled: {
    backgroundColor: "rgba(0,0,0,0.42)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  textDisabled: {
    color: "rgba(255,255,255,0.55)",
  },
});
