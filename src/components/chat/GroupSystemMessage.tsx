import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LocalMessage } from "stream-chat";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  message: LocalMessage;
};

/** Centered join / leave / admin system lines in group chats. */
export function GroupSystemMessage({ message }: Props) {
  const { theme, isDark } = useTheme();
  const text = message.text?.trim();
  if (!text) return null;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <Text style={[styles.text, { color: theme.subtext }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "100%",
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },
});
