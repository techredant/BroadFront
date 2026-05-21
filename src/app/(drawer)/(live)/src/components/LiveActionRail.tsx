import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TT } from "../liveTikTokLayout";

const QUICK_EMOJI = ["😂", "👏", "🔥"] as const;

function formatLikes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Props = {
  hidden: boolean;
  likeCount: number;
  onGift: () => void;
  onHeart: () => void;
  onEmoji: (emoji: string) => void;
};

export function LiveActionRail({
  hidden,
  likeCount,
  onGift,
  onHeart,
  onEmoji,
}: Props) {
  if (hidden) return null;

  return (
    <View style={styles.rail} pointerEvents="box-none">
      <Pressable style={styles.btn} onPress={onGift}>
        <Ionicons name="gift" size={24} color="#FFD700" />
        <Text style={styles.label}>Gift</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={onHeart}>
        <View style={styles.heartWrap}>
          <Ionicons name="heart" size={30} color={TT.liveRed} />
        </View>
        <Text style={styles.likeCount}>{formatLikes(likeCount)}</Text>
      </Pressable>
      {QUICK_EMOJI.map((emoji) => (
        <Pressable
          key={emoji}
          style={styles.btnSmall}
          onPress={() => onEmoji(emoji)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: TT.railRight,
    bottom: TT.railBottom,
    zIndex: 22,
    alignItems: "center",
    gap: TT.railGap,
  },
  btn: {
    width: TT.railBtn + 8,
    alignItems: "center",
    gap: 2,
  },
  heartWrap: {
    shadowColor: TT.liveRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  btnSmall: {
    width: TT.railBtn,
    height: TT.railBtn,
    borderRadius: TT.railBtn / 2,
    backgroundColor: TT.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 21 },
  label: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likeCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
