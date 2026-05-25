import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { AppSpinner } from "@/components/ui/AppSpinner";

type FeedListFooterProps = {
  loadingMore: boolean;
  hasMore: boolean;
  hasItems: boolean;
  endLabel?: string;
};

export function FeedListFooter({
  loadingMore,
  hasMore,
  hasItems,
  endLabel = "You're all caught up",
}: FeedListFooterProps) {
  const { theme } = useTheme();

  if (loadingMore) {
    return <AppSpinner padded />;
  }

  if (hasItems && !hasMore) {
    return (
      <View style={styles.end}>
        <Text style={[styles.endText, { color: theme.subtext }]}>
          {endLabel}
        </Text>
      </View>
    );
  }

  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  end: {
    paddingVertical: 28,
    alignItems: "center",
  },
  endText: {
    fontSize: 13,
    fontWeight: "500",
  },
  spacer: {
    height: 16,
  },
});
