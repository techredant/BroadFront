import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";

const { width } = Dimensions.get("window");
const cardW = (width - 40) / 2;

function Bone({
  style,
  base,
  pulse,
}: {
  style: StyleProp<ViewStyle>;
  base: string;
  pulse: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 1]),
    backgroundColor: base,
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}

export function MarketSkeleton() {
  const { isDark } = useTheme();
  const base = isDark ? "#2a2a2a" : "#e4e4e4";
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Bone style={styles.search} base={base} pulse={pulse} />
      <Bone style={styles.chips} base={base} pulse={pulse} />
      <View style={styles.row}>
        <Bone style={[styles.card, { width: cardW }]} base={base} pulse={pulse} />
        <Bone style={[styles.card, { width: cardW }]} base={base} pulse={pulse} />
      </View>
      <View style={styles.row}>
        <Bone style={[styles.card, { width: cardW }]} base={base} pulse={pulse} />
        <Bone style={[styles.card, { width: cardW }]} base={base} pulse={pulse} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  search: {
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 22,
  },
  chips: {
    height: 36,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: { height: 220, borderRadius: 16 },
});
