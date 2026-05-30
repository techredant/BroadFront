import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TT } from "@/utils/liveTikTokLayout";

type Props = {
  micMuted: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onInviteGuest?: () => void;
  onEndStream: () => void;
};

export function LiveHostControlsBar({
  micMuted,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
  onInviteGuest,
  onEndStream,
}: Props) {
  return (
    <View style={styles.bar}>
      <ControlBtn
        icon={micMuted ? "mic-off" : "mic"}
        onPress={onToggleMic}
      />
      <ControlBtn
        icon={cameraEnabled ? "videocam" : "videocam-off"}
        onPress={onToggleCamera}
      />
      <ControlBtn icon="camera-reverse" onPress={onFlipCamera} />
      {onInviteGuest ? (
        <ControlBtn icon="person-add" onPress={onInviteGuest} />
      ) : null}
      <ControlBtn icon="call" danger onPress={onEndStream} />
    </View>
  );
}

function ControlBtn({
  icon,
  onPress,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, danger && styles.btnDanger]}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: TT.pillBgStrong,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    ...TT.shadow,
  },
  btnDanger: {
    backgroundColor: TT.liveRed,
    borderColor: "rgba(255,255,255,0.28)",
  },
});
