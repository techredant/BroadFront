import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FloatingParticipantView,
  type FloatingParticipantViewProps,
} from "@stream-io/video-react-native-sdk";

/** WhatsApp-style draggable self-view pinned to the top-right once the call is joined. */
export function BroadcastFloatingLocalVideo(props: FloatingParticipantViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <FloatingParticipantView
      {...props}
      alignment="top-right"
      mirror
      objectFit="cover"
      draggableContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 8 },
      ]}
      participantViewStyle={styles.selfView}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selfView: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
