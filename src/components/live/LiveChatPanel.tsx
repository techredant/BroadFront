import React, { memo, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  liveCommentOpacity,
  pruneVisibleMessages,
  type LiveMessage,
} from "@/utils/livestreamSession";
import { TT } from "@/utils/liveTikTokLayout";

const ChatRow = memo(function ChatRow({
  item,
  hostUserId,
  opacity,
  isNewest,
}: {
  item: LiveMessage;
  hostUserId?: string;
  opacity: number;
  isNewest?: boolean;
}) {
  const isHost =
    item.isHost || (hostUserId && item.userId === hostUserId);

  const wrap = (node: React.ReactNode) =>
    isNewest ? (
      <Animated.View entering={FadeInUp.duration(260).springify().damping(18)}>
        <View style={{ opacity }}>{node}</View>
      </Animated.View>
    ) : (
      <View style={{ opacity }}>{node}</View>
    );

  if (item.kind === "join" || item.kind === "leave") {
    return wrap(
      <View style={styles.presenceRow}>
        <Text style={styles.presenceText} numberOfLines={1}>
          <Text style={styles.presenceName}>{item.userName}</Text>
          {item.kind === "join" ? " joined" : " left"}
        </Text>
      </View>,
    );
  }

  if (item.kind === "chat") {
    return wrap(
      <View style={styles.chatRow}>
        <Text style={styles.chatText} numberOfLines={4}>
          <Text style={[styles.chatUser, isHost && styles.hostUser]}>
            {item.userName}{" "}
          </Text>
          {item.text}
        </Text>
      </View>,
    );
  }

  if (item.kind === "gift") {
    return wrap(
      <View style={styles.chatRow}>
        <Text style={styles.giftText} numberOfLines={2}>
          <Text style={styles.giftEmoji}>{item.giftEmoji || "🎁"} </Text>
          <Text style={styles.giftUser}>{item.userName}</Text> {item.text}
        </Text>
      </View>,
    );
  }

  if (item.kind === "donation") {
    return wrap(
      <View style={styles.chatRow}>
        <Text style={styles.donationText} numberOfLines={2}>
          <Text style={styles.donationUser}>{item.userName}</Text> {item.text}
        </Text>
      </View>,
    );
  }

  return wrap(
    <View style={styles.chatRow}>
      <Text style={styles.sysText}>{item.text}</Text>
    </View>,
  );
});

/** TikTok-style live comments — newest at bottom, scroll up, fade toward top */
export const LiveChatPanel = memo(function LiveChatPanel({
  messages,
  maxHeight,
  hostUserId,
}: {
  messages: LiveMessage[];
  maxHeight: number;
  hostUserId?: string;
}) {
  const listRef = useRef<FlashList<LiveMessage> | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);

  const visible = useMemo(
    () => pruneVisibleMessages(messages),
    [messages],
  );

  const newestId = visible[visible.length - 1]?.id;

  useEffect(() => {
    if (!visible.length) return;
    if (lastSeenIdRef.current === newestId) return;
    lastSeenIdRef.current = newestId ?? null;
    requestAnimationFrame(() => {
      const last = visible.length - 1;
      if (last < 0) return;
      listRef.current?.scrollToIndex?.({ index: last, animated: true });
    });
  }, [newestId, visible.length]);

  return (
    <View style={[styles.wrap, { height: maxHeight, maxHeight }]}>
      <FlashList
        ref={listRef}
        data={visible}
        extraData={newestId}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={36}
        drawDistance={200}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <ChatRow
            item={item}
            hostUserId={hostUserId}
            opacity={liveCommentOpacity(index, visible.length)}
            isNewest={item.id === newestId}
          />
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  list: { flex: 1, backgroundColor: "transparent" },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: 8,
    paddingBottom: 4,
  },
  chatRow: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  chatUser: {
    fontWeight: "800",
    color: "rgba(255,255,255,0.95)",
  },
  hostUser: {
    color: TT.accentCyan,
  },
  giftEmoji: { fontSize: 14 },
  giftText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  giftUser: { fontWeight: "900", color: TT.accentGold },
  donationText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  donationUser: { fontWeight: "900", color: "#FE2C55" },
  sysText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  presenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  presenceText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  presenceName: {
    fontWeight: "800",
    color: "#fff",
  },
});
