import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { JoinToast } from "@/utils/livestreamSession";

function JoinToastItem({ toast, onDone }: { toast: JoinToast; onDone: () => void }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 280 }),
      withTiming(1, { duration: 2800 }),
      withTiming(0, { duration: 400 }),
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 280 }),
      withTiming(-6, { duration: 3200 }),
    );
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.toast, style]}>
      <Text style={styles.text}>
        <Text style={styles.name}>{toast.userName}</Text> joined
      </Text>
    </Animated.View>
  );
}

/** Ephemeral join announcements — deduped upstream */
export function LiveJoinToastLayer({
  toasts,
  onDismiss,
  topOffset,
}: {
  toasts: JoinToast[];
  onDismiss: (id: string) => void;
  topOffset: number;
}) {
  if (!toasts.length) return null;

  return (
    <Animated.View style={[styles.layer, { top: topOffset }]} pointerEvents="none">
      {toasts.map((t) => (
        <JoinToastItem key={t.id} toast={t} onDone={() => onDismiss(t.id)} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: 12,
    right: 80,
    zIndex: 30,
    alignItems: "flex-start",
    gap: 6,
  },
  toast: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(37,244,238,0.35)",
  },
  text: { color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: "600" },
  name: { color: "#25F4EE", fontWeight: "800" },
});
