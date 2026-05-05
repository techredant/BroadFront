import { useTheme } from "@/context/ThemeContext";
import useSocialAuth from "@/hooks/useSocialAuth";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AuthScreen = () => {
  const { handleSocialAuth, loadingStrategy } = useSocialAuth();
  const isLoading = loadingStrategy !== null;
  const { theme } = useTheme();

  const appVersion = Constants.expoConfig?.version;

  // 🔥 animation
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.05, { duration: 2000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={["#000000", "#0F172A", "#1E293B"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 justify-between">
        {/* VERSION */}
        <Text style={[styles.version, { color: theme.subtext }]}>
          Version {appVersion}
        </Text>

        {/* TOP SECTION */}
        <View>
          {/* TITLE */}
          <View className="items-center">
            <Text style={styles.title}>Broadcast</Text>

            <Text style={styles.subtitle}>
              Speak freely. Debate boldly. Shape the future.
            </Text>
          </View>

          {/* HERO IMAGE */}
          <Animated.View
            style={[animatedStyle, { alignItems: "center", marginTop: 20 }]}
          >
            {/* <LinearGradient
              colors={["#6C5CE7", "#4f46e5", "#00B894"]}
              style={styles.imageGlow}
            > */}
              <Image
                source={require("@/assets/images/icon.jpg")}
                style={styles.image}
                contentFit="cover"
              />
            {/* </LinearGradient> */}
          </Animated.View>

          {/* FEATURE CHIPS */}
          <View className="flex-row flex-wrap justify-center gap-3 px-6 mt-6">
            {[
              {
                icon: "megaphone",
                label: "Public Debates",
                color: "#A29BFE",
              },
              {
                icon: "chatbubbles",
                label: "Political Discussions",
                color: "#FF6B6B",
              },
              {
                icon: "people",
                label: "Communities",
                color: "#00B894",
              },
            ].map((chip) => (
              <View key={chip.label} style={styles.chip}>
                <Ionicons
                  name={chip.icon as any}
                  size={14}
                  color={chip.color}
                />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* BOTTOM SECTION */}
        <View className="px-8 pb-5">
          {/* DIVIDER */}
          <View className="flex-row items-center gap-3 mb-6">
            <View className="flex-1 h-px bg-gray-700" />
            <Text style={styles.continue}>Continue with</Text>
            <View className="flex-1 h-px bg-gray-700" />
          </View>

          {/* BUTTONS */}
          <View style={styles.buttonRow}>
            {/* GOOGLE */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              disabled={isLoading}
              onPress={() => !isLoading && handleSocialAuth("oauth_google")}
            >
              {loadingStrategy === "oauth_google" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Image
                  source={require("../../../assets/images/google.png")}
                  style={{ width: 28, height: 28 }}
                />
              )}
            </Pressable>

            {/* APPLE */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              disabled={isLoading}
              onPress={() => !isLoading && handleSocialAuth("oauth_apple")}
            >
              {loadingStrategy === "oauth_apple" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="logo-apple" size={28} color="#fff" />
              )}
            </Pressable>

            {/* GITHUB */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              disabled={isLoading}
              onPress={() => !isLoading && handleSocialAuth("oauth_github")}
            >
              {loadingStrategy === "oauth_github" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="logo-github" size={26} color="#fff" />
              )}
            </Pressable>
          </View>

          {/* TERMS */}
          <Text style={styles.terms}>
            By continuing, you agree to our{" "}
            <Text style={styles.link}>Terms</Text> and{" "}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "#6C5CE7",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    marginTop: 6,
  },
  imageGlow: {
    padding: 3,
    borderRadius: 140,
  },
  image: {
    width: 260,
    height: 260,
    borderRadius: 140,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipText: {
    color: "#CBD5F5",
    fontSize: 12,
    fontWeight: "600",
  },
  continue: {
    color: "#94A3B8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  button: {
    width: 75,
    height: 75,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  terms: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
  },
  link: {
    color: "#6C5CE7",
  },
});
