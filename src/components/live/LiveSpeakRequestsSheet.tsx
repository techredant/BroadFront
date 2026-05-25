import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { SpeakRequest } from "@/utils/livestreamSession";

type Props = {
  visible: boolean;
  requests: SpeakRequest[];
  onClose: () => void;
  onAccept: (req: SpeakRequest) => void;
  onReject: (req: SpeakRequest) => void;
};

function formatTime(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function LiveSpeakRequestsSheet({
  visible,
  requests,
  onClose,
  onAccept,
  onReject,
}: Props) {
  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 400, {
      damping: 22,
      stiffness: 220,
    });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Join requests</Text>
            <Text style={styles.subtitle}>
              {requests.length === 0
                ? "No pending requests"
                : `${requests.length} waiting to join`}
            </Text>

            <FlatList
              data={requests}
              keyExtractor={(item) => item.userId}
              style={styles.list}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons
                    name="hand-right-outline"
                    size={40}
                    color="rgba(255,255,255,0.35)"
                  />
                  <Text style={styles.emptyText}>
                    Requests appear when viewers ask to speak
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.avatarImg}
                      />
                    ) : (
                      <Text style={styles.avatarLetter}>
                        {item.userName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.userName}
                    </Text>
                    <Text style={styles.time}>
                      {formatTime(item.requestedAt)}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => onReject(item)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => onAccept(item)}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </Pressable>
                </View>
              )}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: "72%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  list: { maxHeight: 360 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 44, height: 44 },
  avatarLetter: { color: "#fff", fontWeight: "800", fontSize: 16 },
  meta: { flex: 1, minWidth: 0 },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  time: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FE2C55",
  },
  acceptText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
