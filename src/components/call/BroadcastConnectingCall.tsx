import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallStateHooks } from "@/rtc";

const BTN_BG = "rgba(255,255,255,0.14)";
const RED = "#ef4444";

type ConnectingControlsProps = {
  onToggleSpeaker?: () => void;
  onToggleMic?: () => void;
  onHangup: () => void;
  onFlipCamera?: () => void;
  showSpeaker?: boolean;
  showFlipCamera?: boolean;
  hangupLoading?: boolean;
};

/** Inline control row — speaker · mic · end · flip (matches WhatsApp connecting layout). */
export function BroadcastConnectingControls({
  onToggleSpeaker,
  onToggleMic,
  onHangup,
  onFlipCamera,
  showSpeaker = true,
  showFlipCamera = true,
  hangupLoading = false,
}: ConnectingControlsProps) {
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, optimisticIsMute } = useMicrophoneState();

  const toggleMic = onToggleMic ?? (() => void microphone.toggle());

  return (
    <View style={styles.controlsRow}>
      {showSpeaker ? (
        <Pressable
          style={styles.sideBtn}
          onPress={onToggleSpeaker}
          accessibilityLabel="Toggle speaker"
        >
          <Ionicons name="volume-high" size={24} color="#fff" />
        </Pressable>
      ) : (
        <View style={styles.sideSpacer} />
      )}

      <Pressable
        style={styles.mainBtn}
        onPress={toggleMic}
        accessibilityLabel={optimisticIsMute ? "Unmute" : "Mute"}
      >
        <Ionicons
          name={optimisticIsMute ? "mic-off" : "mic"}
          size={28}
          color="#fff"
        />
      </Pressable>

      <Pressable
        style={[styles.mainBtn, styles.endBtn]}
        onPress={onHangup}
        disabled={hangupLoading}
        accessibilityLabel="End call"
      >
        {hangupLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons
            name="call"
            size={30}
            color="#fff"
            style={styles.endIcon}
          />
        )}
      </Pressable>

      {showFlipCamera ? (
        <Pressable
          style={styles.sideBtn}
          onPress={onFlipCamera}
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </Pressable>
      ) : (
        <View style={styles.sideSpacer} />
      )}
    </View>
  );
}

type Props = {
  peerName: string;
  peerImage?: string;
  statusText?: string;
  isVideoCall?: boolean;
  onToggleSpeaker?: () => void;
  onToggleMic?: () => void;
  onHangup: () => void;
  onFlipCamera?: () => void;
  hangupLoading?: boolean;
};

/** Full-screen 1:1 connecting UI (receiver after accept, or caller waiting to connect). */
export function BroadcastConnectingCall({
  peerName,
  peerImage,
  statusText = "Connecting video…",
  isVideoCall = true,
  onToggleSpeaker,
  onToggleMic,
  onHangup,
  onFlipCamera,
  hangupLoading,
}: Props) {
  const displayName =
    peerName.trim() && peerName.trim() !== "User"
      ? peerName.trim()
      : peerName.trim() || "Member";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <View style={styles.profileBlock}>
          {peerImage ? (
            <Image
              source={{ uri: peerImage }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={56} color="rgba(255,255,255,0.88)" />
            </View>
          )}

          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>

        <BroadcastConnectingControls
          showSpeaker={isVideoCall}
          showFlipCamera={isVideoCall}
          onToggleSpeaker={onToggleSpeaker}
          onToggleMic={onToggleMic}
          onHangup={onHangup}
          onFlipCamera={onFlipCamera}
          hangupLoading={hangupLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  profileBlock: {
    alignItems: "center",
    marginBottom: 48,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 28,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  status: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    width: "100%",
    maxWidth: 320,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BTN_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  sideSpacer: {
    width: 52,
    height: 52,
  },
  mainBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BTN_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  endBtn: {
    backgroundColor: RED,
  },
  endIcon: {
    transform: [{ rotate: "135deg" }],
  },
});
