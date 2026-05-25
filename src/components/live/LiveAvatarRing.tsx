import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LIVE_RED = "#FE2C55";

type Props = {
  live?: boolean;
  size?: number;
  onPress?: () => void;
  /** Show red "LIVE" label beside the dot (e.g. profile screen). */
  showLiveLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

function PulsingDot() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 650, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 650, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0, 1.2 - pulse.value * 0.45),
  }));

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotPulse, ringStyle]} />
      <View style={styles.dot} />
    </View>
  );
}

export function LiveAvatarRing({
  live = false,
  size = 40,
  onPress,
  showLiveLabel = false,
  style,
  children,
}: Props) {
  const content = (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.avatarClip,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {children}
      </View>
      {live ? (
        <View style={[styles.liveBadge, showLiveLabel && styles.liveBadgeLabeled]}>
          <PulsingDot />
          {showLiveLabel ? <Text style={styles.liveLabel}>LIVE</Text> : null}
        </View>
      ) : null}
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

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    position: "relative",
  },
  avatarClip: {
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
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
  dotWrap: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dotPulse: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIVE_RED,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: LIVE_RED,
  },
});
