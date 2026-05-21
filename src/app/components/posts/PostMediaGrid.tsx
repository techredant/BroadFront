import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { LightMediaTile } from "@/app/components/posts/LightMediaTile";
import { useTheme } from "@/context/ThemeContext";
import { isVideoMedia, resolveMediaUrls } from "@/utils/mediaUtils";

const MEDIA_GAP = 4;
const MAX_GRID_TILES = 4;

type Props = {
  uris: string[];
  containerWidth: number;
  onPressItem: (index: number) => void;
  isVisible?: boolean;
  useInlineVideo?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  tileRadius?: number;
};

/** 1 = full width; 2+ = 2-column grid; 5+ shows +N on the 4th tile */
export function PostMediaGrid({
  uris,
  containerWidth,
  onPressItem,
  isVisible = true,
  useInlineVideo = false,
  isMuted = true,
  onToggleMute,
  tileRadius = 12,
}: Props) {
  const { theme, isDark } = useTheme();
  const mediaBg = isDark ? "#000000" : theme.card;
  const resolvedUris = useMemo(() => resolveMediaUrls(uris), [uris]);

  const count = resolvedUris.length;
  if (count === 0) return null;

  const isSingle = count === 1;
  const cellW = isSingle ? containerWidth : (containerWidth - MEDIA_GAP) / 2;
  const cellH = isSingle ? containerWidth * 0.75 : cellW;
  const overflowCount = count > MAX_GRID_TILES ? count - MAX_GRID_TILES : 0;
  const tiles = resolvedUris.slice(0, MAX_GRID_TILES);
  const rows = Math.ceil(tiles.length / 2);
  const gridHeight = isSingle
    ? cellH
    : rows * cellH + (rows - 1) * MEDIA_GAP;

  return (
    <View
      style={[
        styles.mediaGrid,
        {
          width: containerWidth,
          height: gridHeight,
          backgroundColor: mediaBg,
        },
      ]}
    >
      {tiles.map((uri, idx) => {
        const showOverflow = idx === MAX_GRID_TILES - 1 && overflowCount > 0;
        const video = isVideoMedia(uri);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const isLastRowSingle = tiles.length % 2 === 1 && idx === tiles.length - 1;
        const w = isLastRowSingle ? containerWidth : cellW;
        const left = isLastRowSingle ? 0 : col * (cellW + MEDIA_GAP);
        const top = row * (cellH + MEDIA_GAP);

        return (
          <Pressable
            key={`${uri}-${idx}`}
            onPress={() => onPressItem(idx)}
            style={{
              position: "absolute",
              left,
              top,
              width: w,
              height: cellH,
            }}
          >
            <View
              style={[
                styles.mediaCell,
                {
                  borderRadius: tileRadius,
                  width: w,
                  height: cellH,
                  backgroundColor: mediaBg,
                },
              ]}
            >
              {useInlineVideo && video ? (
                <>
                  <Video
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    paused={!isVisible}
                    repeat
                    resizeMode="cover"
                    playInBackground={false}
                    playWhenInactive={false}
                    muted={isMuted}
                  />
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => onPressItem(idx)}
                  />
                  {onToggleMute && (
                    <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
                      <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={16}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <LightMediaTile
                  uri={uri}
                  width="100%"
                  height="100%"
                  borderRadius={tileRadius}
                  onPress={() => onPressItem(idx)}
                  isVisible={isVisible}
                  videoPreviewMs={video ? 2000 : 0}
                />
              )}
              {showOverflow && (
                <View style={styles.mediaOverflow} pointerEvents="none">
                  <Text style={styles.mediaOverflowText}>+{overflowCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaGrid: {
    position: "relative",
    overflow: "hidden",
  },
  mediaCell: {
    overflow: "hidden",
  },
  mediaOverflow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaOverflowText: { color: "#fff", fontSize: 27, fontWeight: "800" },
  muteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
});
