import { useRouter } from "expo-router";
import { Alert } from "react-native";
import type { Channel, StreamChat } from "stream-chat";
import {
  buildStreamDisplayName,
  type StreamChatTarget,
  upsertStreamUser,
} from "@/utils/streamUser";

type UseStartChatParams = {
  client: StreamChat;
  userId: string;
  setChannel: (channel: Channel) => void;
  setCreating: (value: string | null) => void;
};

const useStartChat = ({
  client,
  userId,
  setChannel,
  setCreating,
}: UseStartChatParams) => {
  const router = useRouter();

  const handleStartChat = async (target: StreamChatTarget) => {
    const targetId = target?.clerkId;

    if (!targetId || typeof targetId !== "string") {
      Alert.alert("Error", "Invalid user selected");
      return;
    }

    if (targetId === userId) {
      Alert.alert("Error", "You can't chat with yourself");
      return;
    }

    setCreating(targetId);

    try {
      const displayName = buildStreamDisplayName(target);

      await upsertStreamUser({
        userId: targetId,
        name: displayName,
        image: target.image,
      });

      try {
        await client.queryUsers({
          filter: { id: { $in: [targetId] } },
        });
      } catch {
        // Non-fatal — server upsert is enough for new channels
      }

      const channel = client.channel("messaging", {
        members: [userId, targetId],
      });

      await channel.watch();

      setChannel(channel);
      router.push(`/channel/${channel.cid}`);
    } catch (error) {
      console.log("Error creating chat:", error);
      Alert.alert("Error", "Could not create chat. Please try again.");
    } finally {
      setCreating(null);
    }
  };

  return { handleStartChat };
};

export default useStartChat;
