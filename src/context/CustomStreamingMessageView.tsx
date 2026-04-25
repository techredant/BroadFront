import React from "react";
import { View, StyleSheet } from "react-native";
import { StreamingMessageView } from "@stream-io/chat-react-native-ai";
import { useMessageContext } from "stream-chat-expo";

export const CustomStreamingMessageView = () => {
  const { message } = useMessageContext();

  const text = message?.text?.trim();

  if (!text) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StreamingMessageView text={text} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F5F7FB",
    alignSelf: "flex-start",
    maxWidth: "85%",

    // subtle elevation for modern chat UI
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
