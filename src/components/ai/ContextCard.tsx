import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export function ContextCard({
  title,
  excerpt,
  label,
}: {
  title: string;
  excerpt: string;
  label?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.excerpt, { color: theme.subtext }]} numberOfLines={3}>
        {excerpt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  label: {
    color: "#3797F0",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: { fontSize: 14, fontWeight: "800" },
  excerpt: { fontSize: 12, lineHeight: 17 },
});
