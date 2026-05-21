import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { TT } from "../liveTikTokLayout";

export type FloatingReactionItem = {
  id: string;
  emoji: string;
  left: number;
};

function FloatingReaction({ left, emoji }: { left: number; emoji: string }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    y.value = withTiming(-520, { duration: 1500 });
    opacity.value = withTiming(0, { duration: 1500 });
    scale.value = withTiming(1.35, { duration: 800 });
  }, [opacity, scale, y]);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    bottom: 120,
    left,
    transform: [{ translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[style, styles.emoji]}>{emoji}</Animated.Text>
  );
}

export function LiveReactionsOverlay({
  reactions,
}: {
  reactions: FloatingReactionItem[];
}) {
  return (
    <>
      {reactions.map((r) => (
        <FloatingReaction key={r.id} emoji={r.emoji} left={r.left} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 31 },
});

/** Burst when user taps the same reaction rapidly */
export function shouldBurstReaction(timestamps: number[], windowMs = 700): boolean {
  const now = Date.now();
  const recent = timestamps.filter((t) => now - t < windowMs);
  return recent.length >= 2;
}

export function spawnBurstPositions(
  count: number,
  baseLeft = TT.reactionSpawnX,
): number[] {
  return Array.from(
    { length: count },
    () => baseLeft + (Math.random() * 48 - 24),
  );
}
