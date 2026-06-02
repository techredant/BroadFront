import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  count?: number;
};

export function TrendRowSkeleton({ count = 6 }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.row,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.rank, { backgroundColor: theme.border }]} />
          <View style={styles.body}>
            <View style={[styles.line, { backgroundColor: theme.border, width: "35%" }]} />
            <View style={[styles.line, { backgroundColor: theme.border, width: "70%" }]} />
            <View style={[styles.bar, { backgroundColor: theme.border }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rank: { width: 32, height: 32, borderRadius: 10 },
  body: { flex: 1, gap: 8 },
  line: { height: 10, borderRadius: 5 },
  bar: { height: 6, borderRadius: 3, width: "55%" },
});
