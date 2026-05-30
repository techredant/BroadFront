import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import type { DimensionValue } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { useTheme } from "@/context/ThemeContext";
import {
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";
import { useVideoThumbnail } from "@/utils/videoThumbnail";

const DEFAULT_VIDEO_PREVIEW_MS = 2000;

type Props = {
  uri: string;
  width: DimensionValue;
  height: DimensionValue;
  onPress?: () => void;
  borderRadius?: number;
  /** When false, preview resets (e.g. scrolled off screen). */
  isVisible?: boolean;
  /** Muted autoplay length to hint that the tile is a video; 0 disables. */
  videoPreviewMs?: number;
  /** Pixel width hint for callers; media is compressed on upload. */
  targetWidth?: number;
};

/** Feed tile: images via expo-image; videos show a short muted preview then thumbnail + play icon */
export function LightMediaTile({
  uri,
  width,
  height,
  onPress,
  borderRadius = 12,
  isVisible = true,
  videoPreviewMs = DEFAULT_VIDEO_PREVIEW_MS,
  targetWidth,
}: Props) {
  const { theme, isDark } = useTheme();
  const resolvedUri = useMemo(() => resolveMediaUrl(uri) ?? uri, [uri]);
  const isVideo = isVideoMedia(resolvedUri);
  const thumbUri = useVideoThumbnail(isVideo ? resolvedUri : undefined);
  const tileBg = isDark ? "#111111" : theme.card;
  const videoPosterBg = isDark ? "#1a1a1a" : "#e8e8ed";
  const playIconColor = isDark ? "rgba(255,255,255,0.95)" : theme.primary;

  const optimizedImageUri = resolvedUri;
  const optimizedVideoUri = resolvedUri;
  const optimizedThumbUri = thumbUri;

  const [previewDone, setPreviewDone] = useState(false);

  const previewEnabled = isVideo && videoPreviewMs > 0;
  const showPreview = previewEnabled && isVisible && !previewDone;

  useEffect(() => {
    if (!isVisible) {
      setPreviewDone(false);
      return;
    }
    if (!previewEnabled) return;

    setPreviewDone(false);
    const timer = setTimeout(() => setPreviewDone(true), videoPreviewMs);
    return () => clearTimeout(timer);
  }, [isVisible, previewEnabled, resolvedUri, videoPreviewMs]);

  const content = (
    <View
      style={[
        styles.wrap,
        {
          width,
          height,
          borderRadius,
          backgroundColor: tileBg,
        },
      ]}
    >
      {isVideo ? (
        <>
          {showPreview ? (
            <Video
              source={{ uri: optimizedVideoUri }}
              style={StyleSheet.absoluteFill}
              paused={false}
              muted
              repeat={false}
              resizeMode="cover"
              playInBackground={false}
              playWhenInactive={false}
              onEnd={() => setPreviewDone(true)}
            />
          ) : (
            <>
              {optimizedThumbUri ? (
                <Image
                  source={{ uri: optimizedThumbUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                />
              ) : (
                <View
                  style={[
                    styles.videoPoster,
                    { borderRadius, backgroundColor: videoPosterBg },
                  ]}
                />
              )}
              <View style={styles.playOverlay} pointerEvents="none">
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={22} color={playIconColor} />
                </View>
              </View>
            </>
          )}
        </>
      ) : (
        <Image
          source={{ uri: optimizedImageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  playBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },
});
