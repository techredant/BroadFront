import {
  RtcSurfaceView,
  RenderModeType,
  VideoSourceType,
} from "react-native-agora";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useRtcState } from "@/rtc/AgoraRtcContext";

type RtcVideoViewProps = {
  uid?: number;
  isLocal?: boolean;
  style?: ViewStyle;
  mirror?: boolean;
  /** Android: keep PiP surface above the full-screen remote view. */
  zOrderMediaOverlay?: boolean;
};

export function RtcVideoView({
  uid,
  isLocal,
  style,
  mirror,
  zOrderMediaOverlay,
}: RtcVideoViewProps) {
  const { remoteParticipants } = useRtcState();

  if (isLocal) {
    // Agora uses uid 0 (falsy) → setupLocalVideo. A numeric uid renders as remote.
    return (
      <RtcSurfaceView
        style={[styles.video, style]}
        zOrderMediaOverlay={zOrderMediaOverlay}
        canvas={{
          uid: 0,
          sourceType: VideoSourceType.VideoSourceCamera,
          renderMode: RenderModeType.RenderModeHidden,
          mirrorMode: mirror ? 1 : 0,
        }}
      />
    );
  }

  const remoteUid = uid ?? remoteParticipants[0]?.uid ?? 0;
  if (!remoteUid) return <View style={[styles.empty, style]} />;

  return (
    <RtcSurfaceView
      style={[styles.video, style]}
      canvas={{
        uid: remoteUid,
        sourceType: VideoSourceType.VideoSourceRemote,
        renderMode: RenderModeType.RenderModeHidden,
      }}
    />
  );
}

export function RtcLocalVideoView(
  props: Omit<RtcVideoViewProps, "isLocal">,
) {
  return <RtcVideoView {...props} isLocal mirror />;
}

export function RtcRemoteVideoView(
  props: Omit<RtcVideoViewProps, "isLocal">,
) {
  return <RtcVideoView {...props} isLocal={false} />;
}

const styles = StyleSheet.create({
  video: { flex: 1, backgroundColor: "#000" },
  empty: { flex: 1, backgroundColor: "#111" },
});
