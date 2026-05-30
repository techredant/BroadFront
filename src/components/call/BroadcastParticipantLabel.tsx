import { StyleSheet, Text, View } from "react-native";
import type { RtcParticipant } from "@/rtc/types";
import { resolveCallParticipantName } from "@/utils/callDisplayName";

type Props = {
  participant: RtcParticipant & { isLocalParticipant?: boolean; name?: string };
  displayNames: Record<string, string>;
};

export function BroadcastParticipantLabel({ participant, displayNames }: Props) {
  const label = participant.isLocalParticipant
    ? "You"
    : resolveCallParticipantName(
        participant.userId,
        displayNames,
        participant.name,
      );

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "70%",
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
