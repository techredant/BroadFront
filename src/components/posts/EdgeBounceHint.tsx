import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
  type SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type EdgeDirection = "left" | "right" | "up" | "down";

interface EdgeBounceHintProps {
  direction?: EdgeDirection;
  visible?: boolean;
  canNavigate?: boolean;
  gestureProgress?: SharedValue<number>;
}

const HINT_MESSAGES: Record<EdgeDirection, { text: string; icon: string }> = {
  left: { text: "Swipe up for next post", icon: "arrow-up" },
  right: { text: "Swipe down for previous post", icon: "arrow-down" },
  up: { text: "Swipe up for next post", icon: "arrow-up" },
  down: { text: "Swipe down for previous post", icon: "arrow-down" },
};

export const EdgeBounceHint = ({
  direction,
  visible = false,
  canNavigate = true,
  gestureProgress,
}: EdgeBounceHintProps) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible && canNavigate && direction) {
      // Animate in with bounce
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 100 }),
      );

      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 2000);

      return () => clearTimeout(timer);
    } else if (visible && !canNavigate) {
      // Quick pulse if can't navigate
      opacity.value = withSequence(
        withTiming(0.5, { duration: 100 }),
        withTiming(0, { duration: 200 }),
      );
    }
  }, [visible, canNavigate, direction, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.max(
      opacity.value,
      gestureProgress
        ? interpolate(
            gestureProgress.value,
            [0, 1],
            [0, canNavigate ? 0.9 : 0.45],
            Extrapolate.CLAMP,
          )
        : 0,
    ),
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const message = direction ? HINT_MESSAGES[direction] : null;

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle, styles.center]}
      pointerEvents="none"
    >
      <View style={[styles.hint, !canNavigate && styles.hintDisabled]}>
        <Ionicons
          name={message.icon as any}
          size={20}
          color={canNavigate ? "#fff" : "rgba(255,255,255,0.5)"}
        />
        <Text
          style={[styles.hintText, !canNavigate && styles.hintTextDisabled]}
        >
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  hintDisabled: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  hintText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  hintTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
});
