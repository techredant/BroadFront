import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TT } from "../liveTikTokLayout";

type Props = {
  hostName: string;
  streamTitle?: string;
  viewerCount: number;
  isHost: boolean;
  topInset: number;
  showFollow?: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  onFollow?: () => void;
  onClose: () => void;
  onShare: () => void;
};

export function LiveTopBar({
  hostName,
  streamTitle,
  viewerCount,
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
    <View style={[styles.row, { paddingTop: topInset + 6 }]}>
      {!isHost && (
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      )}

      <View style={styles.hostPill}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {streamTitle ? (
            <Text style={styles.sub} numberOfLines={1}>
              {streamTitle}
            </Text>
          ) : null}
        </View>
        {showFollow && onFollow && (
          <Pressable
            style={[styles.followBtn, isFollowing && styles.followBtnOn]}
            onPress={onFollow}
            disabled={followLoading}
          >
            <Text style={[styles.followText, isFollowing && styles.followTextOn]}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.right}>
        {isHost && (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        <View style={styles.viewers}>
          <Ionicons name="person" size={12} color="#fff" />
          <Text style={styles.viewerCount}>{viewerCount}</Text>
        </View>
        <Pressable onPress={onShare} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="arrow-redo" size={20} color="#fff" />
        </Pressable>
        {isHost && (
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="power" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    top: 0,
    left: TT.dockLeft,
    right: TT.dockLeft,
    zIndex: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TT.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },
  hostPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TT.pillBg,
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 4,
    paddingRight: 8,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TT.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  meta: { flex: 1, marginLeft: 8, minWidth: 0 },
  name: { color: "#fff", fontWeight: "700", fontSize: 12 },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 10, marginTop: 1 },
  followBtn: {
    backgroundColor: TT.liveRed,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
  },
  followBtnOn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  followText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  followTextOn: { color: "rgba(255,255,255,0.9)" },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TT.liveRed,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveText: { color: "#fff", fontWeight: "800", fontSize: 9 },
  viewers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TT.pillBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  viewerCount: { color: "#fff", fontWeight: "700", fontSize: 11 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TT.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
