import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { MediaSlide } from "./MediaSlide";
import { useGestureNavigation } from "@/hooks/useGestureNavigation";
import { prefetchImageUris } from "@/hooks/useFeedMediaPrefetch";
import { resolveMediaUrl } from "@/utils/mediaUtils";

type MediaCarouselProps = {
  mediaList: string[];
  postIndex: number;
  activePostIndex: number;
  initialIndex: number;
  width: number;
  height: number;
  zoomStyle?: any;
  pinchGesture?: any;
  isZooming?: boolean;
  pixelWidth?: number;
  onIndexChange: (postIndex: number, mediaIndex: number) => void;
  onEdgeHint?: (direction: "up" | "down") => void;
  onBufferingChange?: (buffering: boolean) => void;
};

function MediaCarouselComponent({
  mediaList,
  postIndex,
  activePostIndex,
  initialIndex,
  width,
  height,
  zoomStyle,
  pinchGesture,
  isZooming = false,
  pixelWidth,
  onIndexChange,
  onEdgeHint,
  onBufferingChange,
}: MediaCarouselProps) {
  const listRef = useRef<FlashListRef<string>>(null);
  const currentIndexRef = useRef(initialIndex);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const active = postIndex === activePostIndex;
  const { edgePanGesture, edgeBounceStyle } = useGestureNavigation({
    mediaIndex: currentIndex,
    mediaCount: mediaList.length,
    isZooming,
    onEdgeHint,
  });

  useEffect(() => {
    currentIndexRef.current = initialIndex;
    setCurrentIndex(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: Math.min(initialIndex, Math.max(mediaList.length - 1, 0)),
        animated: false,
      });
    });
  }, [initialIndex, mediaList.length]);

  useEffect(() => {
    const nearby = [initialIndex - 1, initialIndex, initialIndex + 1]
      .map((index) => mediaList[index])
      .map((item) => (item ? resolveMediaUrl(item) ?? item : null))
      .filter((uri): uri is string => Boolean(uri));

    prefetchImageUris(nearby);
  }, [initialIndex, mediaList]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex !== "number") return;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      onIndexChange(postIndex, nextIndex);
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <MediaSlide
        item={item}
        width={width}
        height={height}
        isActive={active && index === currentIndex}
        isActivePost={active}
        zoomStyle={zoomStyle}
        pinchGesture={pinchGesture}
        pixelWidth={pixelWidth}
        onBufferingChange={
          active && index === currentIndexRef.current ? onBufferingChange : undefined
        }
      />
    ),
    [
      active,
      currentIndex,
      height,
      onBufferingChange,
      pinchGesture,
      pixelWidth,
      width,
      zoomStyle,
    ],
  );

  const keyExtractor = useCallback(
    (item: string, index: number) => `${item}-${index}`,
    [],
  );

  return (
    <View style={[styles.viewport, { width, height }]}>
      <GestureDetector gesture={Gesture.Simultaneous(edgePanGesture, Gesture.Native())}>
        <Animated.View style={[styles.track, edgeBounceStyle]}>
          <FlashList
            ref={listRef}
            horizontal
            pagingEnabled
            data={mediaList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            initialScrollIndex={initialIndex}
            estimatedItemSize={width}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            bounces
            scrollEnabled={!isZooming}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            drawDistance={width * 2}
            overrideProps={{ initialDrawBatchSize: 3 }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const MediaCarousel = memo(MediaCarouselComponent);
export type { MediaCarouselProps };

const styles = StyleSheet.create({
  viewport: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
  track: {
    flex: 1,
  },
});
