import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SUGGESTIONS = [
  "Summarize this civic issue clearly",
  "Add neutral election context",
  "Suggest hashtags for this county",
];

export function AIComposeSuggestions({
  onSelect,
}: {
  onSelect?: (suggestion: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {SUGGESTIONS.map((item) => (
        <TouchableOpacity
          key={item}
          style={styles.chip}
          onPress={() => onSelect?.(item)}
        >
          <Text style={styles.text}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: "rgba(55, 151, 240, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: { color: "#3797F0", fontSize: 12, fontWeight: "700" },
});
