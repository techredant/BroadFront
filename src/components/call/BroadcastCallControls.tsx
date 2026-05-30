import { Ionicons } from "@expo/vector-icons";
import {
  CallingState,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { joinCallWithMedia } from "@/utils/callMedia";

const RED = "#ef4444";
const GREEN = "#22c55e";
const BTN_BG = "rgba(255,255,255,0.14)";

type ControlProps = {
  onDone?: () => void;
};

export function BroadcastIncomingCallControls({
  onDone,
  isVideoCall = true,
}: ControlProps & { isVideoCall?: boolean }) {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);

  const reject = async () => {
    if (!call || callingState === CallingState.LEFT) return;
    setBusy("reject");
    try {
      await call.leave({ reject: true, reason: "decline" });
      onDone?.();
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    if (!call) return;
    setBusy("accept");
    try {
      await joinCallWithMedia(call, isVideoCall);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.row}>
      <CircleButton
        iconColor={RED}
        icon="call"
        rotate
        onPress={reject}
        loading={busy === "reject"}
      />
      <CircleButton
        iconColor={GREEN}
        icon="call"
        onPress={accept}
        loading={busy === "accept"}
      />
    </View>
  );
}

export function BroadcastOutgoingCallControls({ onDone }: ControlProps) {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [loading, setLoading] = useState(false);

  const hangUp = async () => {
    if (!call || callingState === CallingState.LEFT) return;
    setLoading(true);
    try {
      await call.leave({ reject: true, reason: "cancel" });
      onDone?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.row}>
      <CircleButton
        iconColor={RED}
        icon="call"
        rotate
        onPress={hangUp}
        loading={loading}
      />
    </View>
  );
}

export function BroadcastActiveCallControls({
  onHangup,
  showCamera = true,
  showSpeakerToggle = false,
  showFlipCamera = false,
  onToggleSpeaker,
  onFlipCamera,
}: {
  onHangup: () => void | Promise<void>;
  showCamera?: boolean;
  showSpeakerToggle?: boolean;
  showFlipCamera?: boolean;
  onToggleSpeaker?: () => void;
  onFlipCamera?: () => void;
}) {
  const call = useCall();
  const micOn = call?.microphone.state.status === "enabled";
  const camOn = call?.camera.state.status === "enabled";

  return (
    <View style={styles.activeRow}>
      {showSpeakerToggle ? (
        <SmallButton icon="volume-high" onPress={() => onToggleSpeaker?.()} />
      ) : null}
      <SmallButton
        icon={micOn ? "mic" : "mic-off"}
        onPress={() => call?.microphone.toggle()}
      />
      <CircleButton
        iconColor={RED}
        icon="call"
        rotate
        onPress={onHangup}
        size={72}
      />
      {showFlipCamera ? (
        <SmallButton icon="camera-reverse" onPress={() => onFlipCamera?.()} />
      ) : showCamera ? (
        <SmallButton
          icon={camOn ? "videocam" : "videocam-off"}
          onPress={() => call?.camera.toggle()}
        />
      ) : (
        <View style={styles.smallBtnPlaceholder} />
      )}
    </View>
  );
}

function CircleButton({
  iconColor,
  icon,
  rotate,
  onPress,
  loading,
  size = 76,
  backgroundColor = BTN_BG,
}: {
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  rotate?: boolean;
  onPress: () => void;
  loading?: boolean;
  size?: number;
  backgroundColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <Ionicons
          name={icon}
          size={size * 0.45}
          color={iconColor}
          style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
        />
      )}
    </Pressable>
  );
}

function SmallButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.smallBtn}>
      <Ionicons name={icon} size={26} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 48,
    paddingVertical: 24,
  },
  activeRow: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  smallBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  smallBtnPlaceholder: {
    width: 56,
    height: 56,
  },
});
