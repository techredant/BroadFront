import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { MediaCarousel } from "./MediaCarousel";
import { prefetchImageUris } from "@/hooks/useFeedMediaPrefetch";
import { resolveMediaUrl } from "@/utils/mediaUtils";

type MediaPost = {
  _id?: string;
  id?: string;
  media?: string[];
  [key: string]: any;
};

type Props = {
  posts: MediaPost[];
  width: number;
  height: number;
  activePostIndex: number;
  getPostId: (index: number) => string;
  getMediaIndex: (postIndex: number) => number;
  setActivePost: (postIndex: number) => void;
  setMediaIndexForPost: (postIndex: number, mediaIndex: number) => void;
  onEdgeHint?: (direction: "up" | "down") => void;
  zoomStyle?: any;
  pinchGesture?: any;
  isZooming?: boolean;
  onBufferingChange?: (buffering: boolean) => void;
};

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<MediaPost>);

function mediaForPost(post: MediaPost | undefined) {
  return Array.isArray(post?.media) ? post.media : [];
}

function MediaPostPage({
  post,
  index,
  width,
  height,
  activePostIndex,
  getMediaIndex,
  setMediaIndexForPost,
  onEdgeHint,
  zoomStyle,
  pinchGesture,
  isZooming,
  pixelWidth,
  onBufferingChange,
  scrollY,
}: {
  post: MediaPost;
  index: number;
  width: number;
  height: number;
  activePostIndex: number;
  getMediaIndex: (postIndex: number) => number;
  setMediaIndexForPost: (postIndex: number, mediaIndex: number) => void;
  onEdgeHint?: (direction: "up" | "down") => void;
  zoomStyle?: any;
  pinchGesture?: any;
  isZooming?: boolean;
  pixelWidth: number;
  onBufferingChange?: (buffering: boolean) => void;
  scrollY: SharedValue<number>;
}) {
  const pageStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value - index * height);
    return {
      transform: [
        {
          scale: interpolate(distance, [0, height], [1, 0.965], Extrapolate.CLAMP),
        },
        {
          translateY: interpolate(
            scrollY.value - index * height,
            [-height, 0, height],
            [-22, 0, 22],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

  const mediaList = useMemo(() => mediaForPost(post), [post]);

  return (
    <Animated.View style={[styles.page, { width, height }, pageStyle]}>
      <MediaCarousel
        mediaList={mediaList}
        postIndex={index}
        activePostIndex={activePostIndex}
        initialIndex={getMediaIndex(index)}
        width={width}
        height={height}
        zoomStyle={zoomStyle}
        pinchGesture={pinchGesture}
        isZooming={isZooming}
        pixelWidth={pixelWidth}
        onIndexChange={setMediaIndexForPost}
        onEdgeHint={onEdgeHint}
        onBufferingChange={
          index === activePostIndex ? onBufferingChange : undefined
        }
      />
    </Animated.View>
  );
}

const MemoPostPage = memo(MediaPostPage);

export function MediaPostPager({
  posts,
  width,
  height,
  activePostIndex,
  getPostId,
  getMediaIndex,
  setActivePost,
  setMediaIndexForPost,
  onEdgeHint,
  zoomStyle,
  pinchGesture,
  isZooming,
  onBufferingChange,
}: Props) {
  const listRef = useRef<FlashListRef<MediaPost>>(null);
  const initialScrollDoneRef = useRef(false);
  const scrollY = useSharedValue(activePostIndex * height);
  const pixelWidth = useMemo(
    () => Math.round(width * PixelRatio.get()),
    [width],
  );
  const postsKey = useMemo(
    () => posts.map((post, index) => getPostId(index)).join("|"),
    [getPostId, posts],
  );

  useEffect(() => {
    if (!posts.length) return;
    initialScrollDoneRef.current = false;
  }, [postsKey, posts.length]);

  useEffect(() => {
    if (!posts.length || initialScrollDoneRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: Math.min(activePostIndex, posts.length - 1),
        animated: false,
      });
      scrollY.value = activePostIndex * height;
      initialScrollDoneRef.current = true;
    });
  }, [activePostIndex, height, posts.length, scrollY]);

  useEffect(() => {
    const uris = [activePostIndex - 1, activePostIndex, activePostIndex + 1]
      .flatMap((index) => mediaForPost(posts[index]).slice(0, 2))
      .map((item) => (item ? resolveMediaUrl(item) ?? item : null))
      .filter((uri): uri is string => Boolean(uri));

    prefetchImageUris(uris);
  }, [activePostIndex, posts]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 82,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex === "number") setActivePost(nextIndex);
    },
  ).current;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderItem = useCallback(
    ({ item, index }: { item: MediaPost; index: number }) => (
      <MemoPostPage
        post={item}
        index={index}
        width={width}
        height={height}
        activePostIndex={activePostIndex}
        getMediaIndex={getMediaIndex}
        setMediaIndexForPost={setMediaIndexForPost}
        onEdgeHint={onEdgeHint}
        zoomStyle={zoomStyle}
        pinchGesture={pinchGesture}
        isZooming={isZooming}
        pixelWidth={pixelWidth}
        onBufferingChange={onBufferingChange}
        scrollY={scrollY}
      />
    ),
    [
      activePostIndex,
      getMediaIndex,
      height,
      isZooming,
      onBufferingChange,
      onEdgeHint,
      pinchGesture,
      pixelWidth,
      scrollY,
      setMediaIndexForPost,
      width,
      zoomStyle,
    ],
  );

  const keyExtractor = useCallback(
    (_: MediaPost, index: number) => getPostId(index),
    [getPostId],
  );

  return (
    <View style={styles.root}>
      <AnimatedFlashList
        ref={listRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        estimatedItemSize={height}
        initialScrollIndex={activePostIndex}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        scrollEnabled={!isZooming}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        drawDistance={height * 2}
        overrideProps={{ initialDrawBatchSize: 3 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  page: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
