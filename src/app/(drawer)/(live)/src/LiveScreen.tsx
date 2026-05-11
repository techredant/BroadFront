import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StreamCall,
  VideoRenderer,
  useCall,
  useCallStateHooks,
  callManager,
  useStreamVideoClient,
  CallingState,
} from "@stream-io/video-react-native-sdk";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  goToHomeScreen: () => void;
  callId: string;
  isHost?: boolean;
};

export default function LiveScreen({
  goToHomeScreen,
  callId,
  isHost = false,
}: Props) {
  const client = useStreamVideoClient();
  const insets = useSafeAreaInsets();

  const call = useMemo(() => {
    if (!client) return null;
    return client.call("livestream", callId);
  }, [client, callId]);

  useEffect(() => {
    if (!call) return;

    let disposed = false;

    const join = async () => {
      try {
        if (isHost) {
          await call.getOrCreate();

          await call.camera.enable();
          await call.microphone.enable();

          await call.join({ create: true });

          await call.goLive();

          callManager.start({
            audioRole: "communicator",
            deviceEndpointType: "speaker",
          });
        } else {
          await call.join({ create: false });
        }
      } catch (err) {
        console.log("join live error:", err);
      }
    };

    join();

    const handleEnded = () => {
      if (!disposed) goToHomeScreen();
    };

    call.on("call.ended", handleEnded);

    return () => {
      disposed = true;
      call.off("call.ended", handleEnded);
      call.leave().catch(() => {});
      callManager.stop();
    };
  }, [call, isHost, goToHomeScreen]);

  if (!call) return null;

  return (
    <StreamCall call={call}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LeaveStateHandler goToHomeScreen={goToHomeScreen} />
      <LiveCanvas
        isHost={isHost}
        goToHomeScreen={goToHomeScreen}
        insetsBottom={insets.bottom}
      />
    </StreamCall>
  );
}

/* ---------------- STATE HANDLER ---------------- */

function LeaveStateHandler({ goToHomeScreen }: { goToHomeScreen: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (callingState === CallingState.LEFT) goToHomeScreen();
  }, [callingState, goToHomeScreen]);

  return null;
}

/* ---------------- LIVE CANVAS ---------------- */

function LiveCanvas({
  isHost,
  goToHomeScreen,
  insetsBottom,
}: {
  isHost: boolean;
  goToHomeScreen: () => void;
  insetsBottom: number;
}) {
  const call = useCall();

  const {
    useLocalParticipant,
    useParticipants,
    useParticipantCount,
    useMicrophoneState,
    useCameraState,
    useDominantSpeaker,
  } = useCallStateHooks();

  const localParticipant = useLocalParticipant();
  const participants = useParticipants();
  const dominantSpeaker = useDominantSpeaker();

  /**
   * 🔥 FIXED: stable livestream video selection
   * - host sees self
   * - viewer sees dominant speaker (host)
   */
  const videoParticipant = isHost
    ? localParticipant
    : (dominantSpeaker ?? participants.find((p) => !p.isLocal));

  const viewers = useParticipantCount();
  const mic = useMicrophoneState();
  const cam = useCameraState();

  const [messages, setMessages] = useState([
    { id: "1", text: "Welcome to the livestream!" },
  ]);
  const [input, setInput] = useState("");
  const [reactions, setReactions] = useState<
    { id: number; emoji: string; left: number }[]
  >([]);
  const lastTap = useRef(0);

  const onTapVideo = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) addReaction("❤️");
    lastTap.current = now;
  };

  const addReaction = (emoji: string) => {
    const id = Date.now();
    const left = Math.random() * 220 + 40;
    setReactions((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1500);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: input.trim() },
    ]);
    setInput("");
  };

  const leaveViewer = async () => {
    try {
      await call?.leave();
    } finally {
      goToHomeScreen();
    }
  };

  const endLiveHost = async () => {
    try {
      await call?.endCall();
    } catch (err) {
      console.log("end live error:", err);
    } finally {
      goToHomeScreen();
    }
  };

  return (
    <View style={styles.root}>
      {/* VIDEO (UNCHANGED UI) */}
      <Pressable style={styles.videoTouch} onPress={onTapVideo}>
        {videoParticipant ? (
          <VideoRenderer
            participant={videoParticipant}
            trackType="videoTrack"
            style={styles.video}
          />
        ) : (
          <View
            style={[
              styles.video,
              {
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ color: "#fff" }}>Waiting for livestream...</Text>
          </View>
        )}
      </Pressable>

      {/* REACTIONS */}
      {reactions.map((r) => (
        <FloatingReaction key={r.id} emoji={r.emoji} left={r.left} />
      ))}

      {/* TOP BAR */}
      <View style={styles.topBar}>
        {isHost && (
          <View style={styles.liveBadge}>
            <View style={styles.dot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}

        <View style={styles.viewersPill}>
          <Ionicons name="eye" color="white" size={16} />
          <Text style={styles.viewersText}>{viewers}</Text>
        </View>
      </View>

      {/* REACTIONS RAIL */}
      <View style={styles.reactionsRail}>
        {["❤️", "👍", "👏", "🔥"].map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => addReaction(emoji)}
            style={styles.reactionBtn}
          >
            <Text style={styles.reactionBtnText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      {/* BOTTOM PANEL */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.78)"]}
        style={[
          styles.bottomPanel,
          { paddingBottom: Math.max(insetsBottom + 8, 14) },
        ]}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.chatListContent}
          renderItem={({ item }) => (
            <Text style={styles.chatMsg}>{item.text}</Text>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Say something..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            style={styles.input}
          />
          <Pressable onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          {isHost ? (
            <>
              <ControlChip
                icon={mic?.isMute ? "mic-off" : "mic"}
                label={mic?.isMute ? "Unmute" : "Mute"}
                onPress={() => call?.microphone.toggle()}
              />
              <ControlChip
                icon={cam?.isEnabled ? "videocam" : "videocam-off"}
                label={cam?.isEnabled ? "Camera Off" : "Camera On"}
                onPress={() => call?.camera.toggle()}
              />
              <ControlChip
                icon="sync"
                label="Flip"
                onPress={() => call?.camera.flip()}
              />
              <ControlChip
                icon="call"
                label="End Live"
                danger
                onPress={endLiveHost}
              />
            </>
          ) : (
            <ControlChip
              icon="exit-outline"
              label="Leave"
              danger
              onPress={leaveViewer}
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

/* ---------------- UI COMPONENTS (UNCHANGED) ---------------- */

function ControlChip({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.controlChip,
        danger ? styles.controlChipDanger : styles.controlChipNormal,
      ]}
    >
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={styles.controlChipText}>{label}</Text>
    </Pressable>
  );
}

function FloatingReaction({ left, emoji }: { left: number; emoji: string }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withTiming(-520, { duration: 1500 });
    opacity.value = withTiming(0, { duration: 1500 });
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    bottom: 110,
    left,
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[style, styles.floatingReaction]}>
      {emoji}
    </Animated.Text>
  );
}

/* ---------------- STYLES (UNCHANGED) ---------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  videoTouch: { flex: 1 },
  video: { flex: 1 },

  topBar: {
    position: "absolute",
    top: 42,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.95)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },

  liveBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  viewersPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.75)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },

  viewersText: { color: "#fff", fontWeight: "700" },

  reactionsRail: {
    position: "absolute",
    right: 12,
    bottom: 230,
    zIndex: 20,
    alignItems: "center",
  },

  reactionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(17,24,39,0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  reactionBtnText: { fontSize: 21 },

  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 260,
    paddingTop: 10,
    paddingHorizontal: 12,
  },

  chatListContent: { paddingBottom: 8 },

  chatMsg: { color: "#fff", marginBottom: 6, fontSize: 13 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },

  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#fff",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  controlsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },

  controlChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  controlChipNormal: { backgroundColor: "rgba(17,24,39,0.82)" },
  controlChipDanger: { backgroundColor: "rgba(220,38,38,0.92)" },

  controlChipText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 12,
  },

  floatingReaction: { fontSize: 30 },
});
