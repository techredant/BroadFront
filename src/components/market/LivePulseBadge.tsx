import React, { useEffect } from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

type Props = {
  style?: ViewStyle;
  compact?: boolean;
};

export function LivePulseBadge({ style, compact }: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.65, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0, 1.4 - pulse.value * 0.55),
  }));

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, style]}>
      <View style={styles.dotWrap}>
        <Animated.View style={[styles.pulseRing, ringStyle]} />
        <View style={styles.dot} />
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(254, 44, 85, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  label: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 9,
  },
});
