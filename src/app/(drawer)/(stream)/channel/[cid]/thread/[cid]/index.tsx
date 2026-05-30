import { EmptyState } from "@/components/EmptyState";
import { ChatGallery } from "@/components/ChatGallery";
import { ChatKeyboardCompatibleView } from "@/components/ChatKeyboardCompatibleView";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageText } from "@/components/ChatMessageText";
import { ChatVideoThumbnail } from "@/components/ChatVideoThumbnail";
import { useAppContext } from "@/contexts/AppProvider";
import { useHeaderHeight } from "@react-navigation/elements";
import { ActivityIndicator, View } from "react-native";
import { useStreamChannelLayout } from "@/utils/chatLayout";
import { Channel, Thread } from "stream-chat-expo";

const ThreadScreen = () => {
  const { channel, thread, setThread } = useAppContext();
  const headerHeight = useHeaderHeight();
  const channelLayout = useStreamChannelLayout(headerHeight);

  if (channel === null)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );

  return (
    <View className="flex-1 bg-surface">
      <Channel
        channel={channel}
        {...channelLayout}
        KeyboardCompatibleView={ChatKeyboardCompatibleView}
        thread={thread}
        threadList
        Gallery={ChatGallery}
        VideoThumbnail={ChatVideoThumbnail}
        MessageText={ChatMessageText}
        EmptyStateIndicator={() => (
          <EmptyState
            icon="book-outline"
            title="No messages yet"
            subtitle="Start a conversation!"
          />
        )}
      >
        <View className="flex-1 justify-start">
          <Thread
            MessageInput={ChatMessageInput}
            onThreadDismount={() => setThread(null)}
          />
        </View>
      </Channel>
    </View>
  );
};

export default ThreadScreen;
