import { ComposerView } from "@stream-io/chat-react-native-ai";
import { useCallback, useMemo } from "react";
import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AIStates, useAIState, useChannelContext, useMessageComposer, useMessageInputContext, useStableCallback } from "stream-chat-expo";

export const CustomComposerView = () => {
  const messageComposer = useMessageComposer();
  const { sendMessage } = useMessageInputContext();
  const { channel } = useChannelContext();

  const { aiState } = useAIState(channel);

  const stopGenerating = useCallback(
    () => channel?.stopAIResponse(),
    [channel],
  );

  const isGenerating = [AIStates.Thinking, AIStates.Generating].includes(
    aiState,
  );

  const safeAreaInsets = useSafeAreaInsets();
  const insets = useMemo(
    () => ({
      ...safeAreaInsets,
      bottom:
        safeAreaInsets.bottom +
        (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) * 2 : 0),
    }),
    [safeAreaInsets],
  );

  const serializeToMessage = useStableCallback(
    async ({ text, attachments }: { text: string; attachments?: any[] }) => {
      messageComposer.textComposer.setText(text);
      if (attachments && attachments.length > 0) {
        const localAttachments = await Promise.all(
          attachments.map((a) =>
            messageComposer.attachmentManager.fileToLocalUploadAttachment(a),
          ),
        );
        messageComposer.attachmentManager.upsertAttachments(localAttachments);
      }

      await sendMessage();
    },
  );

  return (
    <ComposerView
      bottomSheetInsets={insets}
      onSendMessage={serializeToMessage}
      isGenerating={isGenerating}
      stopGenerating={stopGenerating}
    />
  );
};
