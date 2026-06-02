import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export function ProfileHeaderSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      />
      <View style={styles.lines}>
        <View style={[styles.line, styles.lineLg, { backgroundColor: theme.card }]} />
        <View style={[styles.line, styles.lineSm, { backgroundColor: theme.card }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  lines: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  line: {
    borderRadius: 6,
    height: 12,
  },
  lineLg: { width: "45%" },
  lineSm: { width: "30%" },
});
