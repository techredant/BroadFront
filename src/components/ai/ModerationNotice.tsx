import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function ModerationNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.notice}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255, 193, 7, 0.15)",
  },
  text: { color: "#A66A00", fontSize: 12, lineHeight: 17 },
});
