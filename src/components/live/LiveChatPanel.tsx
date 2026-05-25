import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  pruneVisibleMessages,
  type LiveMessage,
} from "@/utils/livestreamSession";

function ChatRow({ item }: { item: LiveMessage }) {
  if (item.kind === "chat") {
    return (
      <View style={styles.chatLine}>
        <Text style={styles.chatText} numberOfLines={4}>
          <Text style={styles.chatUser}>{item.userName} </Text>
          {item.text}
        </Text>
      </View>
    );
  }

  if (item.kind === "join") {
    return (
      <View style={styles.sysLine}>
        <Text style={styles.sysText}>
          <Text style={styles.sysUser}>{item.userName}</Text> joined
        </Text>
      </View>
    );
  }

  if (item.kind === "donation") {
    return (
      <View style={[styles.sysLine, styles.donationLine]}>
        <Text style={styles.donationText}>
          <Text style={styles.donationUser}>{item.userName}</Text> {item.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.sysLine}>
      <Text style={styles.sysText}>{item.text}</Text>
    </View>
  );
}

/** TikTok-style live comments — soft top fade, no MaskedView (Android-safe) */
export function LiveChatPanel({
  messages,
  maxHeight,
}: {
  messages: LiveMessage[];
  maxHeight: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(
    () => pruneVisibleMessages(messages),
    [messages, tick],
  );

  return (
    <View style={[styles.wrap, { maxHeight }]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        inverted
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ChatRow item={item} />}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.15)", "transparent"]}
        locations={[0, 0.35, 1]}
        style={styles.topFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
  },
  list: { flexGrow: 0 },
  listContent: { paddingTop: 20, paddingBottom: 4 },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 2,
  },
  chatLine: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 5,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chatUser: {
    fontWeight: "800",
    color: "#fff",
  },
  sysLine: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    marginBottom: 5,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sysText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
  },
  sysUser: { fontWeight: "800", color: "#25F4EE" },
  donationLine: {
    backgroundColor: "rgba(254,44,85,0.35)",
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.5)",
  },
  donationText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },
  donationUser: { fontWeight: "900" },
});
