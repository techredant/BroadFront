import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { LIVE_MARKET_REACTIONS } from "@/utils/livestreamSession";
import { TT } from "@/utils/liveTikTokLayout";

type Props = {
  hidden: boolean;
  onReact: (emoji: string) => void;
};

/** TikTok-style reaction rail for marketplace livestreams */
export function LiveMarketReactionBar({ hidden, onReact }: Props) {
  if (hidden) return null;

  return (
    <View style={styles.rail} pointerEvents="box-none">
      {LIVE_MARKET_REACTIONS.map(({ type, emoji, label }) => (
        <Pressable
          key={type}
          style={styles.btn}
          onPress={() => onReact(emoji)}
          accessibilityLabel={label}
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
    gap: 12,
  },
  btn: {
    width: TT.railBtn,
    height: TT.railBtn,
    borderRadius: TT.railBtn / 2,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  emoji: { fontSize: 22 },
});
