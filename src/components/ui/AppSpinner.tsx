import React from "react";
import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";

type AppSpinnerProps = {
  size?: "small" | "large";
  style?: ViewStyle;
  padded?: boolean;
};

/** Consistent loading indicator across screens. */
export function AppSpinner({
  size = "small",
  style,
  padded = true,
}: AppSpinnerProps) {
  const { theme } = useTheme();

  return (
    <View style={[padded && styles.padded, style]}>
      <ActivityIndicator size={size} color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  padded: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
