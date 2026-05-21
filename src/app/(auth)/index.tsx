import { useTheme } from "@/context/ThemeContext";
import { getVisibleAuthProviders } from "@/constants/authProviders";
import { PoliticalPalette } from "@/constants/politicalTheme";
import useSocialAuth from "@/hooks/useSocialAuth";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const AuthScreen = () => {
  const { handleSocialAuth, loadingStrategy } = useSocialAuth();
  const isLoading = loadingStrategy !== null;
  const { theme } = useTheme();
  const providers = useMemo(() => getVisibleAuthProviders(), []);

  const appVersion = Constants.expoConfig?.version;

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.04, { duration: 2200 }), -1, true);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={[PoliticalPalette.navyDark, "#0F172A", "#1E293B"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.version, { color: theme.subtext }]}>
            Version {appVersion}
          </Text>

          <View style={styles.heroBlock}>
            <View style={styles.goldRule} />
            <Text style={styles.title}>Broadcast</Text>
            <Text style={styles.subtitle}>
              Speak freely. Debate boldly. Shape the future.
            </Text>

            <Animated.View style={[styles.imageWrap, animatedStyle]}>
              {/* <View style={styles.imageRing}> */}
                <Image
                  source={require("@/assets/images/icon.jpg")}
                  style={styles.image}
                  contentFit="cover"
                />
              {/* </View> */}
            </Animated.View>

            <View style={styles.chips}>
              {[
                { icon: "megaphone" as const, label: "Public Debates" },
                { icon: "chatbubbles" as const, label: "Discussions" },
                { icon: "people" as const, label: "Communities" },
              ].map((chip) => (
                <View key={chip.label} style={styles.chip}>
                  <Ionicons
                    name={chip.icon}
                    size={14}
                    color={"white"}
                  />
                  <Text style={styles.chipText}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.authBlock}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.continueLabel}>Continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.providerGrid}>
              {providers.map((provider) => {
                const active = loadingStrategy === provider.strategy;
                return (
                  <Pressable
                    key={provider.strategy}
                    style={({ pressed }) => [
                      styles.providerBtn,
                      {
                        backgroundColor: provider.tint ?? "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.1)",
                        opacity: pressed || (isLoading && !active) ? 0.7 : 1,
                      },
                    ]}
                    disabled={isLoading}
                    onPress={() => handleSocialAuth(provider.strategy)}
                    accessibilityLabel={`Continue with ${provider.label}`}
                  >
                    {active ? (
                      <ActivityIndicator color={provider.brandColor} />
                    ) : (
                      <>
                        <Ionicons
                          name={provider.icon}
                          size={22}
                          color={provider.brandColor}
                        />
                        <Text style={styles.providerLabel}>{provider.label}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.link}>Terms</Text> and{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
    justifyContent: "space-between",
    minHeight: "100%",
  },
  version: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  heroBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  goldRule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: PoliticalPalette.gold,
    marginBottom: 14,
  },
  title: {
    fontSize: 33,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  imageWrap: {
    alignItems: "center",
    marginTop: 22,
  },
  imageRing: {
    padding: 4,
    borderRadius: 132,
    borderWidth: 2,
    borderColor: PoliticalPalette.gold,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 128,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    // backgroundColor: "rgba(201,162,39,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.25)",
  },
  chipText: {
    color: "#E8E0C8",
    fontSize: 11,
    fontWeight: "600",
  },
  authBlock: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  continueLabel: {
    color: "#94A3B8",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  providerGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    alignContent: "center",
    gap: 20,
  },
  providerBtn: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  providerLabel: {
    color: "#F1F5F9",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  providerHint: {
    color: "#64748B",
    fontSize: 10,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
  terms: {
    color: "#64748B",
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 17,
  },
  link: {
    color: PoliticalPalette.gold,
    fontWeight: "600",
  },
});
