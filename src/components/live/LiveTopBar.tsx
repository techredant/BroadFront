import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TT } from "@/utils/liveTikTokLayout";

type Props = {
  hostName: string;
  hostImage?: string | null;
  hostVerified?: boolean;
  streamTitle?: string;
  viewerCount: number;
  streamDuration?: string;
  isHost: boolean;
  topInset: number;
  showFollow?: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  onFollow?: () => void;
  onClose: () => void;
  onShare: () => void;
};

function LivePulseBadge() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, dotStyle]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

export function LiveTopBar({
  hostName,
  hostImage,
  hostVerified = false,
  streamTitle,
  viewerCount,
  streamDuration,
  isHost,
  topInset,
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  onFollow,
  onClose,
  onShare,
}: Props) {
  const displayName = hostName.trim() || "Broadcaster";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 8 }]}>
      <View style={styles.row}>
        {!isHost && (
          <Pressable onPress={onClose} style={styles.glassBtn} hitSlop={10}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </Pressable>
        )}

        <View style={styles.hostGlass}>
          {hostImage ? (
            <Image source={{ uri: hostImage }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initial}>{initial}</Text>
            </View>
          )}
          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {hostVerified ? (
                <VerifiedBadge isVerified size={14} />
              ) : null}
            </View>
            {streamTitle ? (
              <Text style={styles.sub} numberOfLines={1}>
                {streamTitle}
              </Text>
            ) : null}
          </View>
          {showFollow && onFollow ? (
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnOn]}
              onPress={onFollow}
              disabled={followLoading}
            >
              <Text style={[styles.followText, isFollowing && styles.followTextOn]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.actions}>
          <LivePulseBadge />
          <View style={styles.viewerPill}>
            <Ionicons name="eye-outline" size={13} color="#fff" />
            <Text style={styles.viewerCount}>{viewerCount}</Text>
          </View>
          {streamDuration ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{streamDuration}</Text>
            </View>
          ) : null}
          <Pressable onPress={onShare} style={styles.glassBtn} hitSlop={8}>
            <Ionicons name="arrow-redo" size={18} color="#fff" />
          </Pressable>
          {isHost ? (
            <Pressable onPress={onClose} style={[styles.glassBtn, styles.endBtn]} hitSlop={8}>
              <Ionicons name="power" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 28,
    paddingHorizontal: TT.dockLeft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TT.glass,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    ...TT.shadow,
  },
  endBtn: {
    backgroundColor: "rgba(254,44,85,0.85)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  hostGlass: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TT.pillBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    minWidth: 0,
    ...TT.shadow,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TT.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#fff", fontWeight: "800", fontSize: 15 },
  meta: { flex: 1, marginLeft: 8, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: { color: "#fff", fontWeight: "800", fontSize: 13, flexShrink: 1 },
  sub: { color: "rgba(255,255,255,0.72)", fontSize: 10, marginTop: 1 },
  followBtn: {
    backgroundColor: TT.liveRed,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
  },
  followBtnOn: {
    backgroundColor: TT.glass,
    borderWidth: 1,
    borderColor: TT.glassBorder,
  },
  followText: { color: "#fff", fontWeight: "800", fontSize: 10 },
  followTextOn: { color: "rgba(255,255,255,0.9)" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TT.liveRed,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  liveText: { color: "#fff", fontWeight: "900", fontSize: 9, letterSpacing: 0.6 },
  viewerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TT.pillBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  viewerCount: { color: "#fff", fontWeight: "700", fontSize: 11 },
  durationPill: {
    backgroundColor: TT.pillBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  durationText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
