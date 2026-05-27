import React, { memo, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Video from "react-native-video";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import LoaderKitView from "react-native-loader-kit";
import { buildCloudinaryUrl, isVideoMedia, resolveMediaUrl } from "@/utils/mediaUtils";

type MediaSlideProps = {
  item: string;
  width: number;
  height: number;
  isActive: boolean;
  isActivePost?: boolean;
  zoomStyle?: any;
  pinchGesture?: any;
  pixelWidth?: number;
  onBufferingChange?: (buffering: boolean) => void;
};

function MediaSlideComponent({
  item,
  width,
  height,
  isActive,
  isActivePost = true,
  zoomStyle,
  pinchGesture,
  pixelWidth,
  onBufferingChange,
}: MediaSlideProps) {
  const uri = useMemo(() => resolveMediaUrl(item) ?? item, [item]);
  const isVideo = useMemo(() => isVideoMedia(uri), [uri]);
  const [videoReady, setVideoReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const optimizedUri = useMemo(
    () =>
      pixelWidth
        ? (buildCloudinaryUrl(uri, {
            width: pixelWidth,
            kind: isVideo ? "video" : "image",
          }) ?? uri)
        : uri,
    [isVideo, pixelWidth, uri],
  );

  const mediaContent = (
    <Animated.View style={[styles.mediaFrame, zoomStyle]}>
      {isVideo ? (
        <>
          {loading ? (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBadge}>
                <LoaderKitView
                  style={styles.loaderIcon}
                  name="BallScaleRippleMultiple"
                  color="#fff"
                />
              </View>
            </View>
          ) : null}
          <Video
            source={{
              uri: optimizedUri,
              bufferConfig: {
                minBufferMs: 2500,
                maxBufferMs: 8000,
                bufferForPlaybackMs: 1000,
                bufferForPlaybackAfterRebufferMs: 1500,
              },
            }}
            style={styles.media}
            paused={!isActive || !isActivePost}
            resizeMode="contain"
            repeat
            muted={false}
            controls={videoReady}
            playWhenInactive={false}
            onLoadStart={() => {
              setLoading(true);
              setVideoReady(false);
              onBufferingChange?.(true);
            }}
            onLoad={() => {
              setLoading(false);
              setVideoReady(true);
              onBufferingChange?.(false);
            }}
            onBuffer={({ isBuffering }) => {
              setLoading(isBuffering);
              onBufferingChange?.(isBuffering);
            }}
            onError={() => {
              setLoading(false);
              onBufferingChange?.(false);
            }}
          />
        </>
      ) : (
        <Image
          source={{ uri: optimizedUri }}
          style={styles.media}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={160}
        />
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.slide, { width, height }]}>
      {!isVideo && pinchGesture ? (
        <GestureDetector gesture={pinchGesture}>{mediaContent}</GestureDetector>
      ) : (
        mediaContent
      )}
    </View>
  );
}

export const MediaSlide = memo(MediaSlideComponent);

const styles = StyleSheet.create({
  slide: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  mediaFrame: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.24)",
    zIndex: 2,
  },
  loadingBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderIcon: {
    width: 36,
    height: 36,
  },
});
