import React, { memo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "@clerk/clerk-expo";
import { useUserPresence } from "@/hooks/useUserPresence";
import { useActiveLiveHosts } from "@/context/ActiveLiveHostsContext";
import { openAudioRoom } from "@/utils/audioRoomNav";
import { fetchActiveLives } from "@/rtc/agoraApi";
import { PoliticalPalette } from "@/constants/politicalTheme";

const LIVE_RED = "#FE2C55";
const AUDIO_PURPLE = "#BF5AF2";
const ONLINE_GREEN = "#22C55E";
const RING_PAD = 3;
const RING_BORDER = 2.5;

type PresenceAvatarProps = {
  userId?: string | null;
  size?: number;
  imageUri?: string | null;
  verified?: boolean;
  showLiveLabel?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  recyclingKey?: string;
  /** Custom avatar content (e.g. story ring). Skips default image. */
  children?: React.ReactNode;
};

const PulsingAudioRing = memo(function PulsingAudioRing({
  size,
}: {
  size: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const ringSize = size + RING_PAD * 2;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.audioRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: RING_BORDER,
        },
        animatedStyle,
      ]}
    />
  );
});

const PulsingLiveRing = memo(function PulsingLiveRing({
  size,
}: {
  size: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const ringSize = size + RING_PAD * 2;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.liveRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: RING_BORDER,
        },
        animatedStyle,
      ]}
    />
  );
});

const PulsingLiveDot = memo(function PulsingLiveDot() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.7, { duration: 650, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 650, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0, 1.15 - pulse.value * 0.4),
  }));

  return (
    <View style={styles.liveDotWrap} pointerEvents="none">
      <Animated.View style={[styles.liveDotPulse, ringStyle]} />
      <View style={styles.liveDot} />
    </View>
  );
});

const PulsingAudioDot = memo(function PulsingAudioDot() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.7, { duration: 650, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 650, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0, 1.15 - pulse.value * 0.4),
  }));

  return (
    <View style={styles.liveDotWrap} pointerEvents="none">
      <Animated.View
        style={[styles.audioDotPulse, ringStyle]}
      />
      <View style={styles.audioDot} />
    </View>
  );
});

const OnlineDot = memo(function OnlineDot() {
  return <View style={styles.onlineDot} pointerEvents="none" />;
});

export const PresenceLiveLabel = memo(function PresenceLiveLabel({
  userId,
}: {
  userId?: string | null;
}) {
  const { isLive } = useUserPresence(userId);
  if (!isLive) return null;
  return <Text style={styles.liveLabel}>LIVE</Text>;
});

export const PresenceAudioLabel = memo(function PresenceAudioLabel({
  userId,
}: {
  userId?: string | null;
}) {
  const { isLive, isInAudio } = useUserPresence(userId);
  const { getUserAudioCallId, refresh } = useActiveLiveHosts();

  if (isLive || !isInAudio) return null;

  const callId = getUserAudioCallId(userId);

  const onPress = () => {
    if (callId) {
      openAudioRoom(callId);
      return;
    }
    refresh();
    void (async () => {
      let resolved = getUserAudioCallId(userId);
      if (!resolved && userId) {
        try {
          const sessions = await fetchActiveLives("audio");
          const match = sessions.find(
            (s) => String(s.hostClerkId ?? "") === String(userId),
          );
          resolved =
            typeof match?.callId === "string" ? match.callId : undefined;
        } catch {
          /* ignore */
        }
      }
      if (resolved) openAudioRoom(resolved);
      else openAudioRoom("");
    })();
  };

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.audioLabel}>AUDIO</Text>
    </Pressable>
  );
});

function PresenceAvatarInner({
  userId,
  size = 40,
  imageUri,
  verified = false,
  showLiveLabel = false,
  onPress,
  style,
  recyclingKey,
  children,
}: PresenceAvatarProps) {
  const { userId: currentUserId } = useAuth();
  const { isLive, isInAudio, isOnline } = useUserPresence(userId);
  const showLive = isLive;
  const showAudio = !showLive && isInAudio;
  const isSelf = Boolean(
    currentUserId && userId && String(currentUserId) === String(userId),
  );
  const showOnline = !showLive && !showAudio && isOnline && !isSelf;

  const content = (
    <View style={[styles.wrap, style]}>
      {showLive ? <PulsingLiveRing size={size} /> : null}
      {showAudio ? <PulsingAudioRing size={size} /> : null}

      <View
        style={[
          styles.avatarClip,
          {
            width: size,
            height: size,
            borderRadius: children ? 0 : size / 2,
          },
          children ? styles.customChildClip : null,
          verified && !showLive && !showAudio && !children
            ? styles.verifiedBorder
            : null,
        ]}
      >
        {children ??
          (imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: size, height: size, borderRadius: size / 2 }}
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={recyclingKey ?? imageUri ?? userId ?? undefined}
            />
          ) : (
            <View
              style={[
                styles.placeholder,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            />
          ))}
      </View>

      {showLive ? (
        <View
          style={[
            styles.liveBadge,
            showLiveLabel ? styles.liveBadgeLabeled : null,
          ]}
        >
          <PulsingLiveDot />
          {showLiveLabel ? <Text style={styles.liveLabel}>LIVE</Text> : null}
        </View>
      ) : null}

      {showAudio ? (
        <View
          style={[
            styles.liveBadge,
            showLiveLabel ? styles.liveBadgeLabeled : null,
          ]}
        >
          <PulsingAudioDot />
          {showLiveLabel ? <Text style={styles.audioLabel}>AUDIO</Text> : null}
        </View>
      ) : null}

      {showOnline ? <OnlineDot /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export const PresenceAvatar = memo(PresenceAvatarInner);

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  liveRing: {
    position: "absolute",
    borderColor: LIVE_RED,
    zIndex: 1,
  },
  audioRing: {
    position: "absolute",
    borderColor: AUDIO_PURPLE,
    zIndex: 1,
  },
  avatarClip: {
    overflow: "hidden",
    zIndex: 2,
  },
  customChildClip: {
    overflow: "visible",
  },
  verifiedBorder: {
    borderWidth: 1.5,
    borderColor: PoliticalPalette.gold,
  },
  placeholder: {
    backgroundColor: "#CBD5E1",
  },
  liveBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    zIndex: 4,
  },
  liveBadgeLabeled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    bottom: -2,
    right: -4,
  },
  liveLabel: {
    color: LIVE_RED,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  audioLabel: {
    color: AUDIO_PURPLE,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  liveDotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDotPulse: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LIVE_RED,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIVE_RED,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  audioDotPulse: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AUDIO_PURPLE,
  },
  audioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AUDIO_PURPLE,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ONLINE_GREEN,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 4,
  },
});
