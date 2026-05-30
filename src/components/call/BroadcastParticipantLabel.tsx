import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "@stream-io/video-react-bindings";
import type { ParticipantLabelProps } from "@stream-io/video-react-native-sdk";
import { resolveCallParticipantName } from "@/utils/callDisplayName";

type Props = ParticipantLabelProps & {
  displayNames: Record<string, string>;
};

export function BroadcastParticipantLabel({
  participant,
  displayNames,
}: Props) {
  const { t } = useI18n();
  const label = participant.isLocalParticipant
    ? t("You")
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
