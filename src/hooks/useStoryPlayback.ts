import { useCallback, useEffect, useRef, useState } from "react";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import {
  STORY_IMAGE_DURATION_MS,
  STORY_TEXT_DURATION_MS,
  storyDurationFromVideoSeconds,
} from "@/utils/statusStory";

type StoryItem = {
  _id?: string;
  media?: string[];
  caption?: string;
};

function durationForItem(item: StoryItem | undefined, isVideo: boolean, videoSeconds?: number) {
  if (!item) return STORY_IMAGE_DURATION_MS;
  const hasMedia = Boolean(item.media?.[0]);
  if (!hasMedia) return STORY_TEXT_DURATION_MS;
  if (isVideo && videoSeconds && videoSeconds > 0) {
    return storyDurationFromVideoSeconds(videoSeconds);
  }
  return STORY_IMAGE_DURATION_MS;
}

export function useStoryPlayback(options: {
  items: StoryItem[];
  activeIndex: number;
  isVideo: boolean;
  videoSeconds?: number;
  paused: boolean;
  enabled: boolean;
  onComplete: () => void;
}) {
  const { items, activeIndex, isVideo, videoSeconds, paused, enabled, onComplete } =
    options;

  const progress = useSharedValue(0);
  const [segmentIndex, setSegmentIndex] = useState(activeIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimation(progress);
  }, [progress]);

  const startProgress = useCallback(() => {
    clearTimer();
    if (!enabled || paused || !items.length) return;

    const item = items[activeIndex];
    const dur = durationForItem(item, isVideo, videoSeconds);
    progress.value = 0;
    setSegmentIndex(activeIndex);

    progress.value = withTiming(1, { duration: dur }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });
  }, [
    activeIndex,
    clearTimer,
    enabled,
    isVideo,
    items,
    onComplete,
    paused,
    progress,
    videoSeconds,
  ]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    startProgress();
    return clearTimer;
  }, [activeIndex, enabled, paused, startProgress, clearTimer, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(progress.value, 0.001) }],
  }));

  const resetProgress = useCallback(() => {
    progress.value = 0;
  }, [progress]);

  return {
    progressStyle,
    segmentIndex,
    resetProgress,
    restart: startProgress,
    pauseProgress: clearTimer,
  };
}
