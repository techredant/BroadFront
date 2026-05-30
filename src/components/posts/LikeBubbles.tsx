import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const BUBBLE_COUNT = 6;
const FLOAT_DURATION = 720;

type BubbleSpec = {
  id: number;
  drift: number;
  scale: number;
  delay: number;
};

type FloatingHeartProps = {
  drift: number;
  scale: number;
  delay: number;
  color: string;
  onComplete: () => void;
};

function FloatingHeart({
  drift,
  scale,
  delay,
  color,
  onComplete,
}: FloatingHeartProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: FLOAT_DURATION },
        (finished) => {
          if (finished) {
            runOnJS(onComplete)();
          }
        },
      ),
    );
  }, [delay, onComplete, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity =
      p < 0.12 ? p / 0.12 : p > 0.65 ? (1 - p) / 0.35 : 1;

    return {
      opacity,
      transform: [
        { translateX: drift * p },
        { translateY: -52 * p },
        { scale: scale * (0.35 + p * 0.85) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.bubble, animatedStyle]} pointerEvents="none">
      <AntDesign name="heart" size={13} color={color} />
    </Animated.View>
  );
}

type LikeBubblesProps = {
  burstKey: number;
  color?: string;
};

export function LikeBubbles({ burstKey, color = "#E0245E" }: LikeBubblesProps) {
  const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);

  useEffect(() => {
    if (burstKey === 0) return;

    const spawned: BubbleSpec[] = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
      id: burstKey * 100 + i,
      drift: (Math.random() - 0.5) * 48,
      scale: 0.65 + Math.random() * 0.55,
      delay: i * 45,
    }));

    setBubbles((prev) => [...prev, ...spawned]);
  }, [burstKey]);

  const removeBubble = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  if (bubbles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {bubbles.map((b) => (
        <FloatingHeart
          key={b.id}
          drift={b.drift}
          scale={b.scale}
          delay={b.delay}
          color={color}
          onComplete={() => removeBubble(b.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 50,
    elevation: 50,
  },
  bubble: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    elevation: 50,
  },
});
