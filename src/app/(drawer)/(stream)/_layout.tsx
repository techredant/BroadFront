import { View, Text } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import ChatWrapper from "@/app/components/ChatWrapper";
import VideoProvider from "@/app/components/VideoProvider";
import { useLevel } from "@/context/LevelContext";
import { ChatProvider } from "@/contexts/AppContext";
import { chatApiKey, chatUserId, chatUserName, chatUserToken } from "@/utils/chatConfig";
import { useCreateChatClient } from "stream-chat-expo";
import { LocalMessage } from "stream-chat";

export default function stream_layout() {
  const { userDetails } = useLevel();
  const chatClient = useCreateChatClient({
    apiKey: chatApiKey,
    tokenOrProvider: chatUserToken,
    userData: { id: chatUserId, name: chatUserName },
  });
  const isMessageAIGenerated = (message: LocalMessage) =>
    !!message.ai_generated;

  if (!chatClient) {
    return null;
  }

  return (
    <ChatWrapper userDetail={userDetails!}>
      <VideoProvider userDetail={userDetails!}>
        <ChatProvider
          client={chatClient}
          isMessageAIGenerated={isMessageAIGenerated}
        >
          <Stack screenOptions={{ headerShown: false }} />
        </ChatProvider>
      </VideoProvider>
    </ChatWrapper>
  );
}
