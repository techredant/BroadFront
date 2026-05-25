import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { AppSpinner } from "@/components/ui/AppSpinner";

type ScreenPlaceholderProps = {
  message?: string;
  loading?: boolean;
};

/** Full-area loading / empty placeholder for tab screens. */
export function ScreenPlaceholder({
  message = "Loading…",
  loading = true,
}: ScreenPlaceholderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      {loading ? (
        <AppSpinner size="large" padded={false} />
      ) : null}
      <Text style={[styles.text, { color: theme.subtext }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  text: {
    fontSize: 15,
    textAlign: "center",
  },
});
