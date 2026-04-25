
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import {
  ComposerView,
  ComposerViewProps,
  StreamingMessageView,
} from "@stream-io/chat-react-native-ai";
import { useCallback, useMemo } from "react"
import { startAI, summarize } from "@/hooks/requests";
import { CustomMessage } from "@/context/AiChatContext";
import { Channel, EmptyStateIndicator, MessageList, useStableCallback } from "stream-chat-expo";
import { CustomStreamingMessageView } from "@/context/CustomStreamingMessageView";
import { CustomComposerView } from "@/context/CustomComposerView";
import { useAppContext } from "@/contexts/AppContext";

// ... our code snippets from above

const RenderNull = () => null;

const additionalFlatListProps = {
  maintainVisibleContentPosition: {
    minIndexForVisible: 0,
    autoscrollToTopThreshold: 0,
  },
  ListHeaderComponent: null,
};

export const ChatContent = () => {
  const { channel } = useAppContext();
  const { bottom } = useSafeAreaInsets();

  const preSendMessageRequest = useStableCallback(async ({ localMessage }) => {
    if (!channel) {
      return;
    }

    if (!channel.initialized) {
      await channel.watch({
        created_by_id: localMessage.user_id,
      });
      summarize(localMessage.text).then((response) => {
        const { summary } = response as { summary: string };
        channel.update({ name: summary });
      });
    }

    if (
      !Object.keys(channel.state.watchers).some((watcher) =>
        watcher.startsWith("ai-bot"),
      ) &&
      channel.id
    ) {
      await startAI(channel.id);
    }
  });

  if (!channel) {
    return null;
  }

  return (
    <Animated.View
      key={channel.id}
      style={[styles.wrapper, { paddingBottom: bottom }]}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
    >
      <Channel
        channel={channel}
        keyboardVerticalOffset={Platform.OS === "ios" ? 95 : -300}
        initializeOnMount={false}
        preSendMessageRequest={preSendMessageRequest}
        StreamingMessageView={CustomStreamingMessageView}
        Message={CustomMessage}
        enableSwipeToReply={false}
        EmptyStateIndicator={EmptyStateIndicator}
        allowSendBeforeAttachmentsUpload={true}
        NetworkDownIndicator={RenderNull}
        MessageAvatar={RenderNull}
        MessageFooter={RenderNull}
      >
        <MessageList additionalFlatListProps={additionalFlatListProps} />
        <CustomComposerView />
      </Channel>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fcfcfc" },
  emptyContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainerText: { fontSize: 24, fontWeight: "bold" },
  streamingMessageViewWrapper: {
    maxWidth: "100%",
    paddingHorizontal: 16,
  },
  aiTypingIndicatorWrapper: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
