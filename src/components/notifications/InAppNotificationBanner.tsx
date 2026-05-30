import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/notification";
import { notificationIcon } from "@/types/notifications";
import { Ionicons } from "@expo/vector-icons";

export function InAppNotificationBanner() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { banner, dismissBanner } = useNotifications();
  const translateY = useSharedValue(-20);

  useEffect(() => {
    translateY.value = banner ? withSpring(0) : withSpring(-20);
  }, [banner, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!banner) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + 8 }, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismissBanner}>
        <BlurView
          intensity={isDark ? 55 : 75}
          tint={isDark ? "dark" : "light"}
          style={[styles.card, { borderColor: theme.border }]}
        >
          {banner.actor?.image ? (
            <Image source={{ uri: banner.actor.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
              <Ionicons
                name={notificationIcon(banner.type) as any}
                size={18}
                color={theme.primary}
              />
            </View>
          )}
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {banner.title}
            </Text>
            {banner.body ? (
              <Text style={[styles.body, { color: theme.subtext }]} numberOfLines={2}>
                {banner.body}
              </Text>
            ) : null}
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    marginTop: 2,
  },
});
