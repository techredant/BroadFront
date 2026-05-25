import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useChatContext } from "stream-chat-expo";
import type { LocalMessage } from "stream-chat";

type Props = {
  message: LocalMessage;
};

export function CallMissedMessage({ message }: Props) {
  const { theme } = useTheme();
  const { client } = useChatContext();

  const attachment = message.attachments?.[0];
  const callType = attachment?.call_type === "audio" ? "voice" : "video";
  const isMine = message.user?.id === client.userID;

  const label = isMine
    ? `You missed a ${callType} call`
    : `Missed ${callType} call`;

  return (
    <View
      style={{
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Ionicons name="call-outline" size={16} color="#ef4444" />
      <Text
        style={{
          color: theme.subtext,
          fontSize: 12,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
