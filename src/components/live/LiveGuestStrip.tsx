import React, { memo, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { EnrichedRtcParticipant } from "@/rtc/types";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";
import type { SpeakRequest } from "@/utils/livestreamSession";
import { TT } from "@/utils/liveTikTokLayout";

const AVATAR = 56;
const RING_PAD = 3;

type Props = {
  guests: EnrichedRtcParticipant[];
  requests?: SpeakRequest[];
  topOffset: number;
  activeSpeakerId?: string;
  myUserId?: string;
  canModerate?: boolean;
  mutedUserIds?: Set<string>;
  mutingUserIds?: Set<string>;
  profileImages?: Record<string, string | null | undefined>;
  onInvite?: (userId: string, userName: string) => void;
  onDecline?: (userId: string, userName: string) => void;
  onToggleMute?: (userId: string, userName: string, muted: boolean) => void;
  onMuteAll?: () => void;
  onRemoveGuest?: (userId: string, userName: string) => void;
  /** When guest mutes via bottom bar — red ring on their strip avatar. */
  selfMicMuted?: boolean;
};

const PulsingSpeakRing = memo(function PulsingSpeakRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.85);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 550, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 550, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 550, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 550, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.speakRing, ringStyle]}
    />
  );
});

function RoundProfileAvatar({
  userId,
  imageUri,
  isSpeaking,
  isMuted,
  ringVariant = "default",
}: {
  userId: string;
  imageUri?: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  ringVariant?: "default" | "request";
}) {
  return (
    <View style={styles.avatarOuter}>
      {isSpeaking && !isMuted ? <PulsingSpeakRing /> : null}
      <View
        style={[
          styles.avatarClip,
          ringVariant === "request" && styles.requestClip,
          isSpeaking && !isMuted && styles.avatarClipSpeaking,
          isMuted && styles.avatarClipMuted,
        ]}
      >
        <PresenceAvatar
          userId={userId}
          size={AVATAR - 4}
          imageUri={imageUri || undefined}
        />
      </View>
    </View>
  );
}

/** On-stage guests + pending speak requests — round profile pics only, horizontal scroll. */
export function LiveGuestStrip({
  guests,
  requests = [],
  topOffset,
  activeSpeakerId,
  myUserId,
  canModerate = false,
  mutedUserIds = new Set(),
  mutingUserIds = new Set(),
  onInvite,
  onDecline,
  onToggleMute,
  onMuteAll,
  onRemoveGuest,
  selfMicMuted = false,
  profileImages = {},
}: Props) {
  const showRequests = canModerate && requests.length > 0;
  const showGuests = guests.length > 0;
  const showMuteAll =
    canModerate && showGuests && typeof onMuteAll === "function";

  if (!showRequests && !showGuests && !showMuteAll) return null;

  return (
    <View style={[styles.strip, { top: topOffset }]} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {showMuteAll ? (
          <Pressable style={styles.muteAllBtn} onPress={onMuteAll}>
            <Ionicons name="mic-off" size={18} color="#fff" />
            <Text style={styles.muteAllText}>Mute all</Text>
          </Pressable>
        ) : null}

        {requests.map((req) => (
          <View key={`req-${req.userId}`} style={styles.item}>
            <View style={styles.guestTop}>
              <RoundProfileAvatar
                userId={req.userId}
                imageUri={profileImages[req.userId]}
                isSpeaking={false}
                isMuted={false}
                ringVariant="request"
              />
              <View style={styles.requestBadge}>
                <Ionicons name="hand-right" size={10} color="#fff" />
              </View>
            </View>
            <Text style={styles.nameText} numberOfLines={1}>
              {req.userName}
            </Text>
            <View style={styles.requestActions}>
              <Pressable
                style={styles.declineBtn}
                onPress={() => onDecline?.(req.userId, req.userName)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.inviteBtn}
                onPress={() => onInvite?.(req.userId, req.userName)}
              >
                <Ionicons name="checkmark" size={14} color="#000" />
              </Pressable>
            </View>
          </View>
        ))}

        {guests.map((p) => {
          const isSpeaking =
            activeSpeakerId === p.sessionId || Boolean(p.isSpeaking);
          const isMuting = mutingUserIds.has(p.userId);
          const isSelf = Boolean(myUserId && p.userId === myUserId);
          const isMuted = isSelf ? selfMicMuted : mutedUserIds.has(p.userId);
          const showHostMute = canModerate && !isSelf;
          const guestImage = p.image || profileImages[p.userId] || undefined;

          return (
            <View key={p.sessionId} style={styles.item}>
              <View style={styles.guestTop}>
                <RoundProfileAvatar
                  userId={p.userId}
                  imageUri={guestImage}
                  isSpeaking={isSpeaking}
                  isMuted={isMuted}
                />
                {canModerate && !isSelf ? (
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() =>
                      onRemoveGuest?.(p.userId, p.name || "Guest")
                    }
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                ) : null}
                {showHostMute ? (
                  <Pressable
                    style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
                    onPress={() =>
                      onToggleMute?.(p.userId, p.name || "Guest", isMuted)
                    }
                    disabled={isMuting}
                  >
                    {isMuting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name={isMuted ? "mic-off" : "mic"}
                        size={12}
                        color="#fff"
                      />
                    )}
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.nameText} numberOfLines={1}>
                {p.name || "Guest"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: TT.dockLeft,
    right: TT.dockRightInset,
    zIndex: 26,
  },
  row: {
    paddingHorizontal: 4,
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  item: {
    width: AVATAR + 8,
    alignItems: "center",
  },
  guestTop: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarOuter: {
    width: AVATAR + RING_PAD * 2 + 6,
    height: AVATAR + RING_PAD * 2 + 6,
    alignItems: "center",
    justifyContent: "center",
  },
  speakRing: {
    position: "absolute",
    width: AVATAR + RING_PAD * 2 + 8,
    height: AVATAR + RING_PAD * 2 + 8,
    borderRadius: (AVATAR + RING_PAD * 2 + 8) / 2,
    borderWidth: 2.5,
    borderColor: TT.accentCyan,
  },
  avatarClip: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarClipSpeaking: {
    borderColor: TT.accentCyan,
  },
  avatarClipMuted: {
    borderColor: "rgba(239,68,68,0.85)",
    opacity: 0.72,
  },
  requestClip: {
    borderColor: "rgba(167,139,250,0.9)",
  },
  requestBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#7B2FF7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#000",
  },
  nameText: {
    marginTop: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    maxWidth: AVATAR + 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  requestActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  declineBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TT.accentCyan,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(239,68,68,0.95)",
    borderWidth: 1.5,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  muteBtn: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  muteBtnActive: {
    backgroundColor: "rgba(239,68,68,0.92)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  muteAllBtn: {
    height: AVATAR + 8,
    minWidth: 52,
    borderRadius: AVATAR / 2 + 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginRight: 4,
  },
  muteAllText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
