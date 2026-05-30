import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RtcLocalVideoView } from "@/components/call/RtcVideoViews";

/** WhatsApp-style self-view pinned to the top-right once the call is joined. */
export function BroadcastFloatingLocalVideo() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + 8, right: 12 },
      ]}
      pointerEvents="box-none"
    >
      <RtcLocalVideoView style={styles.selfView} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 112,
    height: 160,
    zIndex: 20,
  },
  selfView: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
