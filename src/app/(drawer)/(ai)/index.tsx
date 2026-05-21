import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import type { Channel as ChannelType } from "stream-chat";
import {
  AITypingIndicatorView,
  Channel,
  MessageList,
  useChatContext,
} from "stream-chat-expo";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { EmptyState } from "@/app/components/EmptyState";
import { ChatGallery } from "@/app/components/ChatGallery";
import { ChatMessageInput } from "@/app/components/ChatMessageInput";
import { ChatVideoThumbnail } from "@/app/components/ChatVideoThumbnail";
import { ChatKeyboardCompatibleView } from "@/app/components/ChatKeyboardCompatibleView";
import { ChatWallpaper } from "@/app/components/ChatWallpaper";
import { useStreamChannelLayout } from "@/utils/chatLayout";
import { AI_MODEL, AI_PLATFORM } from "@/constants/ai";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app";

function getAiChannelId(clerkId: string) {
  return `ai-assistant-${clerkId}`;
}

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { userDetails } = useLevel();
  const { client } = useChatContext();
  const headerHeight = useHeaderHeight();
  const channelLayout = useStreamChannelLayout(headerHeight);

  const clerkId = userDetails?.clerkId;
  const streamChannelId = clerkId ? getAiChannelId(clerkId) : null;

  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const initAiChannel = useCallback(async () => {
    if (!client || !clerkId || !streamChannelId) return;

    setBooting(true);
    setError(null);

    try {
      await axios.post(`${BASE_URL}/api/ai/start-ai-agent`, {
        channel_id: streamChannelId,
        channel_type: "messaging",
        user_id: clerkId,
        platform: AI_PLATFORM,
        model: AI_MODEL,
      });

      const ch = client.channel("messaging", streamChannelId);
      await ch.watch();
      setChannel(ch);
    } catch (err: any) {
      console.error("AI channel init failed:", err?.response?.data || err);
      setError(
        err?.response?.data?.reason ||
          err?.response?.data?.error ||
          "Could not start AI assistant",
      );
    } finally {
      setBooting(false);
    }
  }, [client, clerkId, streamChannelId]);

  useEffect(() => {
    initAiChannel();
  }, [initAiChannel]);

  if (!clerkId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.subtext }}>Sign in to use AI chat</Text>
      </View>
    );
  }

  if (booting) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#3797F0" />
        <Text style={[styles.bootText, { color: theme.subtext }]}>
          Connecting to AI…
        </Text>
      </View>
    );
  }

  if (error || !channel) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={theme.subtext} />
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initAiChannel}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ChatWallpaper />
      <Channel
        channel={channel}
        {...channelLayout}
        KeyboardCompatibleView={ChatKeyboardCompatibleView}
        hasCameraPicker={false}
        audioRecordingEnabled={false}
        Gallery={ChatGallery}
        VideoThumbnail={ChatVideoThumbnail}
        EmptyStateIndicator={() => (
          <EmptyState
            icon="sparkles-outline"
            title="Ask me anything"
            subtitle="Messages stream in real time with typing indicators."
          />
        )}
      >
        <MessageList />
        <AITypingIndicatorView channel={channel} />
        <ChatMessageInput />
      </Channel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  bootText: { marginTop: 12, fontSize: 14 },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#3797F0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
