import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import {
  pruneVisibleMessages,
  type LiveMessage,
} from "@/utils/livestreamSession";
import { TT } from "@/utils/liveTikTokLayout";

const ChatRow = memo(function ChatRow({
  item,
  hostUserId,
}: {
  item: LiveMessage;
  hostUserId?: string;
}) {
  const isHost =
    item.isHost || (hostUserId && item.userId === hostUserId);

  if (item.kind === "chat") {
    return (
      <View style={[styles.chatBubble, isHost && styles.hostBubble]}>
        <Text style={styles.chatText} numberOfLines={4}>
          <Text style={[styles.chatUser, isHost && styles.hostUser]}>
            {item.userName}{" "}
          </Text>
          {item.text}
        </Text>
      </View>
    );
  }

  if (item.kind === "gift") {
    return (
      <View style={styles.giftBubble}>
        <Text style={styles.giftEmoji}>{item.giftEmoji || "🎁"}</Text>
        <Text style={styles.giftText} numberOfLines={2}>
          <Text style={styles.giftUser}>{item.userName}</Text> {item.text}
        </Text>
      </View>
    );
  }

  if (item.kind === "join") {
    return null;
  }

  if (item.kind === "donation") {
    return (
      <View style={styles.donationBubble}>
        <Text style={styles.donationText} numberOfLines={2}>
          <Text style={styles.donationUser}>{item.userName}</Text> {item.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.sysBubble}>
      <Text style={styles.sysText}>{item.text}</Text>
    </View>
  );
});

/** TikTok-style live comments — glass bubbles, host highlight, gift lines */
export const LiveChatPanel = memo(function LiveChatPanel({
  messages,
  maxHeight,
  hostUserId,
}: {
  messages: LiveMessage[];
  maxHeight: number;
  hostUserId?: string;
}) {
  const [tick, setTick] = useState(0);
  const listRef = useRef<FlashList<LiveMessage> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    void tick;
    return [...pruneVisibleMessages(messages)]
      .filter((m) => m.kind !== "join")
      .reverse();
  }, [messages, tick]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    });
  }, [visible.length]);

  return (
    <View style={[styles.wrap, { maxHeight }]}>
      <FlashList
        ref={listRef}
        data={visible}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={32}
        drawDistance={140}
        removeClippedSubviews
        style={[
          styles.list,
          { height: Math.min(maxHeight, Math.max(48, visible.length * 32 + 28)) },
        ]}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ChatRow item={item} hostUserId={hostUserId} />
        )}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "rgba(0,0,0,0.2)", "transparent"]}
        locations={[0, 0.4, 1]}
        style={styles.topFade}
        pointerEvents="none"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
  },
  list: { flexGrow: 0 },
  listContent: { paddingTop: 24, paddingBottom: 6 },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    zIndex: 2,
  },
  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    marginBottom: 6,
    backgroundColor: TT.pillBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hostBubble: {
    backgroundColor: "rgba(37,244,238,0.18)",
    borderColor: "rgba(37,244,238,0.45)",
  },
  chatText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#fff",
  },
  chatUser: {
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },
  hostUser: {
    color: TT.accentCyan,
  },
  giftBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 6,
    backgroundColor: "rgba(254,44,85,0.32)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  giftEmoji: { fontSize: 22 },
  giftText: {
    flex: 1,
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  giftUser: { fontWeight: "900", color: TT.accentGold },
  donationBubble: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 6,
    backgroundColor: "rgba(254,44,85,0.38)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  donationText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  donationUser: { fontWeight: "900" },
  sysBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    marginBottom: 6,
    backgroundColor: TT.pillBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sysText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },
});
