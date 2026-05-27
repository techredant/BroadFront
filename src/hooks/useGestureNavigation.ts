import { useEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Config = {
  mediaIndex: number;
  mediaCount: number;
  isZooming?: boolean;
  isBuffering?: boolean;
  onEdgeHint?: (direction: "up" | "down") => void;
};

const SPRING = { damping: 18, stiffness: 260, mass: 0.8 };
const EDGE_DISTANCE = 18;

export function useGestureNavigation({
  mediaIndex,
  mediaCount,
  isZooming = false,
  isBuffering = false,
  onEdgeHint,
}: Config) {
  const dragX = useSharedValue(0);
  const edgeProgress = useSharedValue(0);
  const currentIndex = useSharedValue(mediaIndex);
  const count = useSharedValue(mediaCount);
  const zooming = useSharedValue(isZooming);
  const buffering = useSharedValue(isBuffering);

  useEffect(() => {
    currentIndex.value = mediaIndex;
  }, [currentIndex, mediaIndex]);

  useEffect(() => {
    count.value = mediaCount;
  }, [count, mediaCount]);

  useEffect(() => {
    zooming.value = isZooming;
  }, [isZooming, zooming]);

  useEffect(() => {
    buffering.value = isBuffering;
  }, [buffering, isBuffering]);

  const edgePanGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      if (zooming.value || buffering.value) return;

      const atFirst = currentIndex.value <= 0;
      const atLast = currentIndex.value >= Math.max(count.value - 1, 0);
      const overFirst = atFirst && event.translationX > 0;
      const overLast = atLast && event.translationX < 0;

      if (!overFirst && !overLast) {
        dragX.value = 0;
        edgeProgress.value = 0;
        return;
      }

      dragX.value = event.translationX * 0.22;
      edgeProgress.value = Math.min(Math.abs(event.translationX) / 140, 1);
    })
    .onEnd((event) => {
      if (!zooming.value && !buffering.value && Math.abs(event.translationX) > EDGE_DISTANCE) {
        const atFirst = currentIndex.value <= 0;
        const atLast = currentIndex.value >= Math.max(count.value - 1, 0);

        if (atFirst && event.translationX > 0 && onEdgeHint) {
          runOnJS(onEdgeHint)("down");
        } else if (atLast && event.translationX < 0 && onEdgeHint) {
          runOnJS(onEdgeHint)("up");
        }
      }

      dragX.value = withSpring(0, SPRING);
      edgeProgress.value = withSpring(0, SPRING);
    })
    .onFinalize(() => {
      dragX.value = withSpring(0, SPRING);
      edgeProgress.value = withSpring(0, SPRING);
    });

  const edgeBounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      {
        scale: interpolate(
          edgeProgress.value,
          [0, 1],
          [1, 0.985],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  return {
    edgePanGesture,
    edgeBounceStyle,
    edgeProgress,
  };
}
