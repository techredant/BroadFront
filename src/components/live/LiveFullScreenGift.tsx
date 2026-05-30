import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { TT } from "@/utils/liveTikTokLayout";

export type FullScreenGiftPayload = {
  id: string;
  emoji: string;
  label: string;
  senderName: string;
  amount?: number;
};

export function LiveFullScreenGift({
  gift,
  onDone,
}: {
  gift: FullScreenGiftPayload;
  onDone: () => void;
}) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(-12);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 400 }),
    );
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 180 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0.85, { duration: 400 }),
    );
    rotate.value = withSequence(
      withSpring(0, { damping: 10 }),
      withTiming(6, { duration: 1200 }),
    );
    const t = setTimeout(onDone, 2900);
    return () => clearTimeout(t);
  }, [gift.id, onDone, opacity, rotate, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.card, animStyle]}>
        <Text style={styles.emoji}>{gift.emoji}</Text>
        <Text style={styles.label}>{gift.label}</Text>
        <Text style={styles.sender}>{gift.senderName}</Text>
        {gift.amount ? (
          <Text style={styles.amount}>KES {gift.amount.toLocaleString()}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 24,
    backgroundColor: "rgba(20,20,20,0.88)",
    borderWidth: 1,
    borderColor: TT.glassBorder,
    ...TT.shadow,
  },
  emoji: { fontSize: 72, marginBottom: 8 },
  label: {
    color: TT.accentGold,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  sender: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  amount: {
    color: TT.accentCyan,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
});
