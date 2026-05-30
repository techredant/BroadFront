import React, { useMemo } from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { CachedImage, MediaSkeleton } from "@/components/media/CachedImage";
import { useTheme } from "@/context/ThemeContext";
import { resolveMediaUrl } from "@/utils/mediaUtils";
import { useVideoThumbnail } from "@/utils/videoThumbnail";

type Props = {
  uri: string;
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  isVisible?: boolean;
  autoplay?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onPress?: () => void;
  /**
   * Pixel width for poster/thumbnail generation. Defaults to `width` when it's a
   * finite number, otherwise omitted.
   */
  targetWidth?: number;
};

export function FeedVideoTile({
  uri,
  width,
  height,
  borderRadius = 12,
  isVisible = false,
  autoplay = false,
  isMuted = true,
  onToggleMute,
  onPress,
  targetWidth,
}: Props) {
  const { theme, isDark } = useTheme();
  const resolvedUri = useMemo(() => resolveMediaUrl(uri) ?? uri, [uri]);

  const videoUri = resolvedUri;
  // Always preload the poster thumbnail so the tile is never empty, even
  // when the real <Video> never mounts.
  const thumbUri = useVideoThumbnail(resolvedUri);
  // Only mount the real Video player when the row is fully visible AND the
  // caller explicitly enabled inline autoplay. Otherwise we just show the
  // cached poster + play badge.
  const shouldMountVideo = autoplay && isVisible;
  const posterBg = isDark ? "#111111" : theme.card;

  const content = (
    <View
      style={[
        styles.wrap,
        {
          width,
          height,
          borderRadius,
          backgroundColor: posterBg,
        },
      ]}
    >
      {/* Skeleton lives underneath the poster so empty frames never appear */}
      {!thumbUri ? (
        <MediaSkeleton
          style={StyleSheet.absoluteFill}
          borderRadius={borderRadius}
        />
      ) : null}

      {thumbUri ? (
        <CachedImage
          source={{ uri: thumbUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={140}
        />
      ) : null}

      {shouldMountVideo ? (
        <Video
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          paused={false}
          repeat
          resizeMode="cover"
          playInBackground={false}
          playWhenInactive={false}
          muted={isMuted}
          poster={thumbUri ?? undefined}
          posterResizeMode="cover"
        />
      ) : null}

      {!shouldMountVideo ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playBadge}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
        </View>
      ) : null}

      {shouldMountVideo && onToggleMute ? (
        <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      ) : null}
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
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
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
  muteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
});
