
import { EmptyState } from "@/app/components/EmptyState";
import { FullScreenLoader } from "@/app/components/FullScreenLoader";
import { useAppContext } from "@/contexts/AppProvider";
import { useHeaderHeight } from "@react-navigation/elements";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Channel, Thread } from "stream-chat-expo";

const ThreadScreen = () => {
  const { channel, thread, setThread } = useAppContext();
  const headerHeight = useHeaderHeight();

  if (channel === null) return <FullScreenLoader message="Loading thread..." />;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Channel
        channel={channel}
        keyboardVerticalOffset={headerHeight}
        thread={thread}
        threadList
        EmptyStateIndicator={() => (
          <EmptyState
            icon="book-outline"
            title="No messages yet"
            subtitle="Start a conversation!"
          />
        )}
      >
        <View className="flex-1 justify-start">
          <Thread onThreadDismount={() => setThread(null)} />
        </View>
      </Channel>
    </SafeAreaView>
  );
};

export default ThreadScreen;
