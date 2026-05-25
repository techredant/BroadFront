import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { StreamVideoParticipant } from "@stream-io/video-client";

type Props = {
  visible: boolean;
  participant: StreamVideoParticipant | null;
  isHostParticipant: boolean;
  isMuted: boolean;
  loading?: boolean;
  canModerate: boolean;
  onClose: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onRemove: () => void;
};

export function LiveParticipantSheet({
  visible,
  participant,
  isHostParticipant,
  isMuted,
  loading,
  canModerate,
  onClose,
  onMute,
  onUnmute,
  onRemove,
}: Props) {
  const translateY = useSharedValue(300);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 300, {
      damping: 22,
      stiffness: 220,
    });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!participant) return null;

  const name = participant.name || "Participant";
  const image = participant.image;

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
            <View style={styles.header}>
              <View style={styles.avatar}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                )}
                {isMuted && (
                  <View style={styles.mutedDot}>
                    <Ionicons name="mic-off" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.role}>
                  {isHostParticipant ? "Host" : "Guest"}
                  {isMuted ? " · Muted" : " · Live"}
                </Text>
              </View>
            </View>

            {canModerate && !isHostParticipant && (
              <View style={styles.actions}>
                {loading ? (
                  <ActivityIndicator color="#FE2C55" style={{ marginVertical: 12 }} />
                ) : (
                  <>
                    <Pressable
                      style={styles.actionRow}
                      onPress={isMuted ? onUnmute : onMute}
                    >
                      <Ionicons
                        name={isMuted ? "mic" : "mic-off"}
                        size={22}
                        color="#fff"
                      />
                      <Text style={styles.actionText}>
                        {isMuted ? "Unmute" : "Mute"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionRow, styles.dangerRow]}
                      onPress={onRemove}
                    >
                      <Ionicons
                        name="person-remove-outline"
                        size={22}
                        color="#FE2C55"
                      />
                      <Text style={[styles.actionText, styles.dangerText]}>
                        Remove from livestream
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
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
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 56, height: 56 },
  avatarLetter: { color: "#fff", fontSize: 22, fontWeight: "800" },
  mutedDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#141414",
  },
  headerText: { flex: 1 },
  name: { color: "#fff", fontSize: 17, fontWeight: "800" },
  role: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  actions: { gap: 4, marginBottom: 12 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dangerRow: { borderBottomWidth: 0 },
  dangerText: { color: "#FE2C55" },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
