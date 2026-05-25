import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { DonationToast } from "@/utils/livestreamSession";

export function LiveDonationPopup({
  toast,
  onDone,
}: {
  toast: DonationToast;
  onDone: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 350 }),
    );
    scale.value = withSequence(
      withTiming(1.05, { duration: 220 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0.9, { duration: 350 }),
    );
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.box, style]} pointerEvents="none">
      <Text style={styles.text}>
        <Text style={styles.name}>{toast.userName}</Text> donated KES{" "}
        {toast.amount.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    left: 24,
    right: 24,
    backgroundColor: "rgba(254,44,85,0.92)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
  name: { fontWeight: "900" },
});
