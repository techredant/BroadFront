import React, { useCallback, useEffect } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { TT } from "@/utils/liveTikTokLayout";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function RailButton({
  onPress,
  icon,
  iconColor = "#fff",
  label,
  children,
}: {
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <View style={styles.btnCircle}>
        {children ??
          (icon ? <Ionicons name={icon} size={24} color={iconColor} /> : null)}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

function HeartBurst({ trigger }: { trigger: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!trigger) return;
    scale.value = withSequence(
      withSpring(1.35, { damping: 6, stiffness: 400 }),
      withTiming(1, { duration: 180 }),
    );
  }, [trigger, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name="heart" size={28} color={TT.liveRed} />
    </Animated.View>
  );
}

type Props = {
  hidden: boolean;
  likeCount: number;
  hostImage?: string | null;
  hostInitial?: string;
  showFollow?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onGift: () => void;
  onDonate: () => void;
  onShare: () => void;
  onHeart: () => void;
  heartBurstKey?: number;
};

export function LiveActionRail({
  hidden,
  likeCount,
  hostImage,
  hostInitial = "?",
  showFollow = false,
  isFollowing = false,
  onFollow,
  onGift,
  onDonate,
  onShare,
  onHeart,
  heartBurstKey = 0,
}: Props) {
  const handleHeart = useCallback(() => {
    onHeart();
  }, [onHeart]);

  if (hidden) return null;

  return (
    <View style={styles.rail} pointerEvents="box-none">
      <RailButton onPress={() => {}} label="">
        <View style={styles.hostAvatarWrap}>
          {hostImage ? (
            <Image source={{ uri: hostImage }} style={styles.hostAvatar} contentFit="cover" />
          ) : (
            <View style={styles.hostAvatarFallback}>
              <Text style={styles.hostInitial}>{hostInitial.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </RailButton>

      {showFollow && onFollow ? (
        <RailButton
          onPress={onFollow}
          icon={isFollowing ? "checkmark" : "add"}
          iconColor={isFollowing ? TT.accentCyan : "#fff"}
          label={isFollowing ? "Following" : "Follow"}
        />
      ) : null}

      <Pressable style={styles.btn} onPress={handleHeart}>
        <View style={[styles.btnCircle, styles.heartCircle]}>
          <HeartBurst trigger={heartBurstKey} />
        </View>
        <Text style={styles.likeCount}>{formatCount(likeCount)}</Text>
      </Pressable>

      <RailButton
        onPress={onGift}
        icon="gift"
        iconColor={TT.accentGold}
        label="Gift"
      />

      <RailButton
        onPress={onDonate}
        icon="cash-outline"
        iconColor={TT.accentCyan}
        label="Donate"
      />

      <RailButton onPress={onShare} icon="share-social" label="Share" />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: TT.railRight,
    bottom: TT.railBottom,
    zIndex: 24,
    alignItems: "center",
    gap: TT.railGap,
  },
  btn: {
    width: TT.railBtn + 6,
    alignItems: "center",
    gap: 4,
  },
  btnCircle: {
    width: TT.railBtn,
    height: TT.railBtn,
    borderRadius: TT.railBtn / 2,
    backgroundColor: TT.pillBgStrong,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    ...TT.shadow,
  },
  heartCircle: {
    backgroundColor: "rgba(254,44,85,0.22)",
    borderColor: "rgba(254,44,85,0.45)",
  },
  hostAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: TT.liveRed,
    overflow: "hidden",
  },
  hostAvatar: { width: "100%", height: "100%" },
  hostAvatarFallback: {
    flex: 1,
    backgroundColor: TT.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },
  hostInitial: { color: "#fff", fontWeight: "800", fontSize: 16 },
  label: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  likeCount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
