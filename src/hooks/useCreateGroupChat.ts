import { useRouter } from "expo-router";
import { Alert } from "react-native";
import type { Channel, StreamChat } from "stream-chat";
import {
  buildStreamDisplayName,
  type StreamChatTarget,
  upsertStreamUser,
} from "@/utils/streamUser";
import { generateGroupChannelId } from "@/utils/groupChat";
import { uploadProfileImage } from "@/utils/mediaUpload";

function streamErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg) return msg;
  }
  return "Could not create group. Please try again.";
}

type UseCreateGroupChatParams = {
  client: StreamChat;
  userId: string;
  setChannel: (channel: Channel) => void;
  setCreating: (value: boolean) => void;
};

export function useCreateGroupChat({
  client,
  userId,
  setChannel,
  setCreating,
}: UseCreateGroupChatParams) {
  const router = useRouter();

  const handleCreateGroup = async (
    groupName: string,
    selected: StreamChatTarget[],
    groupImageUri?: string | null,
  ) => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Group name", "Enter a name for your group.");
      return;
    }

    const memberIds = [
      ...new Set(
        selected
          .map((u) => u.clerkId)
          .filter((id) => id && id !== userId),
      ),
    ];

    if (memberIds.length < 2) {
      Alert.alert(
        "Add members",
        "Select at least two people to start a group chat.",
      );
      return;
    }

    setCreating(true);

    try {
      await Promise.all(
        selected.map((target) =>
          upsertStreamUser({
            userId: target.clerkId,
            name: buildStreamDisplayName(target),
            image: target.image,
          }),
        ),
      );

      let imageUrl: string | undefined;
      if (groupImageUri) {
        const uploaded = await uploadProfileImage(groupImageUri);
        if (!uploaded) {
          Alert.alert("Group photo", "Could not upload the group photo. Try again.");
          return;
        }
        imageUrl = uploaded;
      }

      const channelId = generateGroupChannelId(userId);
      const members = [userId, ...memberIds];

      const channelData: Record<string, unknown> = {
        members,
        name,
        is_group: true,
        created_by_id: userId,
      };
      if (imageUrl) channelData.image = imageUrl;

      const channel = client.channel("messaging", channelId, channelData);

      await channel.create();
      await channel.watch();

      setChannel(channel);
      router.push(`/channel/${channel.cid}`);
    } catch (error) {
      console.log("Error creating group chat:", error);
      Alert.alert("Error", streamErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return { handleCreateGroup };
}
