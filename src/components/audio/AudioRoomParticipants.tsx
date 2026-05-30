import React, { useCallback, useState } from "react";
import { useCall, useCallStateHooks, OwnCapability } from "@/rtc";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaColors } from "@/constants/mediaTheme";

type Props = {
  isHost?: boolean;
};

export default function AudioRoomParticipants({ isHost = false }: Props) {
  const call = useCall();
  const { useParticipants, useHasPermissions, useLocalParticipant } =
    useCallStateHooks();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const canModerate =
    isHost ||
    useHasPermissions(OwnCapability.MUTE_USERS) ||
    useHasPermissions(OwnCapability.UPDATE_CALL_PERMISSIONS);

  const [mutingIds, setMutingIds] = useState<Set<string>>(new Set());

  const createdById = call?.state.createdBy?.id;

  const muteParticipant = useCallback(
    async (userId: string, displayName: string) => {
      if (!call || !canModerate) return;

      Alert.alert(
        "Mute speaker",
        `Mute ${displayName}? They can unmute themselves unless you remove their speaker role.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mute",
            style: "destructive",
            onPress: async () => {
              setMutingIds((prev) => new Set(prev).add(userId));
              try {
                await call.muteUser(userId, "audio");
                await call.revokePermissions(userId, [
                  OwnCapability.SEND_AUDIO,
                ]);
              } catch (e) {
                console.error("Mute participant error:", e);
                Alert.alert(
                  "Could not mute",
                  "You may not have permission to mute this participant.",
                );
              } finally {
                setMutingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(userId);
                  return next;
                });
              }
            },
          },
        ],
      );
    },
    [call, canModerate],
  );

  const removeSpeaker = useCallback(
    async (userId: string, displayName: string) => {
      if (!call || !canModerate) return;

      Alert.alert(
        "Remove speaker",
        `Remove ${displayName} from the stage? They will need to request to speak again.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setMutingIds((prev) => new Set(prev).add(userId));
              try {
                await call.revokePermissions(userId, [
                  OwnCapability.SEND_AUDIO,
                ]);
              } catch (e) {
                console.error("Revoke speaker error:", e);
                Alert.alert("Could not remove speaker", "Please try again.");
              } finally {
                setMutingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(userId);
                  return next;
                });
              }
            },
          },
        ],
      );
    },
    [call, canModerate],
  );

  if (!participants.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Waiting for speakers…</Text>
      </View>
    );
  }

  const sorted = [...participants].sort((a, b) => {
    if (a.userId === createdById) return -1;
    if (b.userId === createdById) return 1;
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return 0;
  });

  const isPublishingAudio = (p: (typeof participants)[0]) =>
    p.hasAudio ?? Boolean(p.hasAudio);

  return (
    <View style={styles.container}>
      {canModerate && (
        <Text style={styles.moderatorHint}>
          Tap a participant to mute · long-press to remove from stage
        </Text>
      )}
      <FlatList
        numColumns={3}
        data={sorted}
        keyExtractor={(item) => item.sessionId}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const hasImage = !!item.image;
          const displayName = item.name || "Guest";
          const initial = displayName.charAt(0).toUpperCase();
          const isRoomHost = item.userId === createdById;
          const isSelf = item.userId === localParticipant?.userId;
          const isMuted = !isPublishingAudio(item);
          const isMuting = mutingIds.has(item.userId);
          const showModeration = canModerate && !isSelf && !isRoomHost;

          const onPress = showModeration
            ? () => muteParticipant(item.userId, displayName)
            : undefined;

          const onLongPress = showModeration
            ? () => removeSpeaker(item.userId, displayName)
            : undefined;

          return (
            <Pressable
              style={styles.avatarWrap}
              onPress={onPress}
              onLongPress={onLongPress}
              delayLongPress={400}
              disabled={!showModeration || isMuting}
            >
              <View
                style={[
                  styles.ring,
                  item.isSpeaking && styles.speakingRing,
                  isRoomHost && styles.hostRing,
                  isMuted && styles.mutedRing,
                ]}
              >
                {hasImage ? (
                  <Image style={styles.image} source={{ uri: item.image! }} />
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <Text style={styles.initial}>{initial}</Text>
                  </View>
                )}
                {isMuted && (
                  <View style={styles.mutedOverlay}>
                    <Ionicons name="mic-off" size={22} color="#fff" />
                  </View>
                )}
              </View>
              {item.isSpeaking && !isMuted && (
                <View style={styles.waveBadge}>
                  <Text style={styles.waveText}>♪</Text>
                </View>
              )}
              {showModeration && (
                <View style={styles.modBadge}>
                  {isMuting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="mic-off-outline" size={12} color="#fff" />
                  )}
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {isSelf ? "You" : displayName}
              </Text>
              {isRoomHost && <Text style={styles.role}>Host</Text>}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  moderatorHint: {
    fontSize: 10,
    color: MediaColors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontWeight: "600",
  },
  content: { paddingVertical: 8, paddingHorizontal: 12 },
  row: { justifyContent: "space-around", marginBottom: 20 },
  avatarWrap: { width: "30%", alignItems: "center" },
  ring: {
    padding: 3,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "transparent",
  },
  speakingRing: {
    borderColor: MediaColors.accentCyan,
    shadowColor: MediaColors.accentCyan,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  hostRing: { borderColor: MediaColors.liveRed },
  mutedRing: { borderColor: "rgba(255,255,255,0.25)" },
  image: { width: 76, height: 76, borderRadius: 38 },
  fallbackAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: MediaColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 27, fontWeight: "800", color: "#fff" },
  mutedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 38,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveBadge: {
    position: "absolute",
    top: -4,
    right: 8,
    backgroundColor: MediaColors.liveRed,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  waveText: { color: "#fff", fontSize: 10 },
  modBadge: {
    position: "absolute",
    top: 52,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f0f0f",
  },
  name: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: MediaColors.textPrimary,
    maxWidth: 90,
    textAlign: "center",
  },
  role: {
    fontSize: 9,
    color: MediaColors.liveRed,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: { fontSize: 13, color: MediaColors.textSecondary },
});
