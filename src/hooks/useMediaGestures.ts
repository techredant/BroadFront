import { useEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  Extrapolate,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type GestureDirection = "horizontal" | "vertical" | "none";

interface UseMediaGesturesConfig {
  currentIndex: number;
  mediaCount: number;
  width: number;
  height: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onMediaIndexChange?: (index: number) => void;
  onBounceHint?: (direction: "left" | "right" | "up" | "down") => void;
  isZooming?: boolean;
  isBuffering?: boolean;
  isZoomingValue?: SharedValue<boolean>;
  onDirectionChange?: (direction: GestureDirection) => void;
}

const AXIS_NONE = 0;
const AXIS_HORIZONTAL = 1;
const AXIS_VERTICAL = 2;
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;
const DIRECTION_LOCK_RATIO = 0.7;
const DIRECTION_LOCK_DISTANCE = 8;
const SPRING = { damping: 18, stiffness: 220, mass: 0.9 };

export const useMediaGestures = ({
  currentIndex,
  mediaCount,
  width,
  height,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onMediaIndexChange,
  onBounceHint,
  isZooming = false,
  isBuffering = false,
  isZoomingValue,
  onDirectionChange,
}: UseMediaGesturesConfig) => {
  const currentIndexValue = useSharedValue(currentIndex);
  const mediaCountValue = useSharedValue(mediaCount);
  const widthValue = useSharedValue(width);
  const heightValue = useSharedValue(height);
  const lockedAxis = useSharedValue(AXIS_NONE);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const edgeProgress = useSharedValue(0);
  const zooming = useSharedValue(isZooming);
  const buffering = useSharedValue(isBuffering);

  useEffect(() => {
    currentIndexValue.value = currentIndex;
  }, [currentIndex, currentIndexValue]);

  useEffect(() => {
    mediaCountValue.value = mediaCount;
  }, [mediaCount, mediaCountValue]);

  useEffect(() => {
    widthValue.value = width;
  }, [width, widthValue]);

  useEffect(() => {
    heightValue.value = height;
  }, [height, heightValue]);

  useEffect(() => {
    zooming.value = isZooming;
  }, [isZooming, zooming]);

  useEffect(() => {
    buffering.value = isBuffering;
  }, [buffering, isBuffering]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      lockedAxis.value = AXIS_NONE;
      edgeProgress.value = 0;
    })
    .onUpdate((e) => {
      if (zooming.value || isZoomingValue?.value) return;

      const dx = e.translationX;
      const dy = e.translationY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (lockedAxis.value === AXIS_NONE) {
        if (absDx < DIRECTION_LOCK_DISTANCE && absDy < DIRECTION_LOCK_DISTANCE) {
          return;
        }

        const ratio = absDx / (absDy + 0.1);
        if (ratio > 1 / DIRECTION_LOCK_RATIO) {
          lockedAxis.value = AXIS_HORIZONTAL;
          if (onDirectionChange) runOnJS(onDirectionChange)("horizontal");
        } else if (ratio < DIRECTION_LOCK_RATIO) {
          lockedAxis.value = AXIS_VERTICAL;
          if (onDirectionChange) runOnJS(onDirectionChange)("vertical");
        } else {
          return;
        }
      }

      const index = currentIndexValue.value;
      const lastIndex = Math.max(mediaCountValue.value - 1, 0);
      const atFirst = index <= 0;
      const atLast = index >= lastIndex;

      if (lockedAxis.value === AXIS_HORIZONTAL) {
        const overFirst = atFirst && dx > 0;
        const overLast = atLast && dx < 0;
        dragX.value = overFirst || overLast ? dx * 0.28 : dx;
        dragY.value = 0;
        edgeProgress.value =
          overFirst || overLast ? Math.min(Math.abs(dx) / 120, 1) : 0;
      } else if (lockedAxis.value === AXIS_VERTICAL) {
        const canDragUp = atLast && dy < 0;
        const canDragDown = atFirst && dy > 0;
        dragY.value = canDragUp || canDragDown ? dy : dy * 0.12;
        dragX.value = 0;
        edgeProgress.value = Math.min(Math.abs(dragY.value) / 160, 1);
      }
    })
    .onEnd((e) => {
      if (zooming.value || isZoomingValue?.value) return;

      const dx = e.translationX;
      const dy = e.translationY;
      const vx = e.velocityX;
      const vy = e.velocityY;
      const index = currentIndexValue.value;
      const lastIndex = Math.max(mediaCountValue.value - 1, 0);
      const atFirst = index <= 0;
      const atLast = index >= lastIndex;

      if (lockedAxis.value === AXIS_HORIZONTAL) {
        const shouldSwipe =
          Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > VELOCITY_THRESHOLD;

        if (shouldSwipe && !buffering.value) {
          if (dx > 0) {
            if (!atFirst) {
              const nextIndex = index - 1;
              currentIndexValue.value = nextIndex;
              if (onSwipeRight) runOnJS(onSwipeRight)();
              if (onMediaIndexChange) runOnJS(onMediaIndexChange)(nextIndex);
            } else if (onBounceHint) {
              runOnJS(onBounceHint)("right");
            }
          } else {
            if (!atLast) {
              const nextIndex = index + 1;
              currentIndexValue.value = nextIndex;
              if (onSwipeLeft) runOnJS(onSwipeLeft)();
              if (onMediaIndexChange) runOnJS(onMediaIndexChange)(nextIndex);
            } else if (onBounceHint) {
              runOnJS(onBounceHint)("left");
            }
          }
        } else if (onBounceHint) {
          if (dx > SWIPE_THRESHOLD * 0.4 && atFirst) {
            runOnJS(onBounceHint)("right");
          } else if (dx < -SWIPE_THRESHOLD * 0.4 && atLast) {
            runOnJS(onBounceHint)("left");
          }
        }

        dragX.value = withSpring(0, SPRING);
      } else if (lockedAxis.value === AXIS_VERTICAL) {
        const shouldSwipe =
          Math.abs(dy) > SWIPE_THRESHOLD || Math.abs(vy) > VELOCITY_THRESHOLD;

        if (shouldSwipe) {
          if (dy > 0 && atFirst) {
            if (!buffering.value && onSwipeDown) runOnJS(onSwipeDown)();
          } else if (dy < 0 && atLast) {
            if (!buffering.value && onSwipeUp) runOnJS(onSwipeUp)();
          } else if (onBounceHint) {
            runOnJS(onBounceHint)(dy > 0 ? "down" : "up");
          }
        } else if (onBounceHint) {
          if (dy > SWIPE_THRESHOLD * 0.4 && atFirst) {
            runOnJS(onBounceHint)("down");
          } else if (dy < -SWIPE_THRESHOLD * 0.4 && atLast) {
            runOnJS(onBounceHint)("up");
          }
        }

        dragY.value = withSpring(0, SPRING);
      }

      edgeProgress.value = withSpring(0, SPRING);
      lockedAxis.value = AXIS_NONE;
    })
    .onFinalize(() => {
      dragX.value = withSpring(0, SPRING);
      dragY.value = withSpring(0, SPRING);
      edgeProgress.value = withSpring(0, SPRING);
      lockedAxis.value = AXIS_NONE;
    });

  const carouselAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          -currentIndexValue.value * widthValue.value + dragX.value,
      },
    ],
  }));

  const postContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: dragY.value },
      {
        scale: interpolate(
          Math.abs(dragY.value),
          [0, heightValue.value * 0.25],
          [1, 0.97],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const edgeParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          edgeProgress.value,
          [0, 1],
          [1, 0.97],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  return {
    gesture: panGesture,
    carouselAnimatedStyle,
    postContainerStyle,
    edgeParallaxStyle,
    edgeProgress,
  };
};
