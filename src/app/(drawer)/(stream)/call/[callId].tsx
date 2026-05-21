import { useTheme } from "@/context/ThemeContext";
import {
  BroadcastActiveCallControls,
  BroadcastIncomingCallControls,
  BroadcastOutgoingCallControls,
} from "@/app/components/call/BroadcastCallControls";
import { BroadcastParticipantLabel } from "@/app/components/call/BroadcastParticipantLabel";
import { BroadcastRingingCall } from "@/app/components/call/BroadcastRingingCall";
import {
  buildCallMemberDisplayNames,
  displayNameFromChatUser,
  getRemoteChatMember,
} from "@/utils/callDisplayName";
import { upsertStreamUser } from "@/utils/streamUser";
import { useCallRingtone } from "@/hooks/useCallRingtone";
import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  CallContent,
  CallingState,
  StreamCall,
  callManager,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";

function resolveCallId(raw: string) {
  return raw.includes(":") ? raw.split(":").pop()! : raw;
}

export type CallMode = "video" | "audio";

const CallScreen = () => {
  const {
    callId: rawCallId,
    isCaller: callerParam,
    callMode: callModeParam,
  } = useLocalSearchParams<{
    callId: string;
    isCaller: string;
    callMode?: string;
  }>();

  const callId = rawCallId ? resolveCallId(rawCallId) : "";
  const isCaller = callerParam === "true";
  const callMode: CallMode = callModeParam === "audio" ? "audio" : "video";
  const isVideoCall = callMode === "video";

  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [effectiveCallMode, setEffectiveCallMode] =
    useState<CallMode>(callMode);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [remotePeer, setRemotePeer] = useState<{
    name: string;
    image?: string;
  }>({ name: "User" });

  useEffect(() => {
    if (!videoClient || !callId || !chatClient?.userID) return;

    let cancelled = false;

    const startCall = async () => {
      setLoading(true);
      setError(null);

      try {
        const channel = chatClient.channel("messaging", callId);
        await channel.watch();

        const myId = chatClient.userID!;
        const nameMap = buildCallMemberDisplayNames(channel, myId);
        setDisplayNames(nameMap);

        const remote = getRemoteChatMember(channel, myId);
        const remoteName = displayNameFromChatUser(remote?.user);
        const remoteImage = remote?.user?.image;
        setRemotePeer({ name: remoteName, image: remoteImage });

        await Promise.all(
          Object.entries(nameMap).map(([userId, name]) =>
            userId === myId
              ? Promise.resolve()
              : upsertStreamUser({
                  userId,
                  name,
                  image: channel.state.members[userId]?.user?.image,
                }).catch(() => {}),
          ),
        );

        // Reuse the call instance the SDK registered on call.ring (critical for ringing flow).
        let _call = videoClient.call("default", callId, {
          reuseInstance: true,
        });
        if (!isCaller && !_call.ringing) {
          await new Promise((r) => setTimeout(r, 400));
          _call = videoClient.call("default", callId, { reuseInstance: true });
        }

        if (isCaller) {
          const memberIds = new Set<string>([myId]);
          Object.values(channel.state.members).forEach((m) => {
            if (m.user_id) memberIds.add(m.user_id);
          });

          await _call.getOrCreate({
            ring: true,
            video: isVideoCall,
            data: {
              members: Array.from(memberIds).map((user_id) => ({ user_id })),
              custom: { triggeredBy: myId, callMode },
            },
          });

          if (isVideoCall) {
            await _call.camera.enable();
          } else {
            await _call.camera.disable();
          }
          await _call.microphone.enable();
        } else {
          if (!_call.ringing) {
            await _call.get({ ring: true });
          }
          const custom = _call.state?.custom as
            | { callMode?: string }
            | undefined;
          if (custom?.callMode === "audio" && !cancelled) {
            setEffectiveCallMode("audio");
          }
        }

        if (!cancelled) setCall(_call);
      } catch (err) {
        console.error("Failed to start call:", err);
        if (!cancelled) setError("Failed to start the call. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startCall();

    return () => {
      cancelled = true;
    };
  }, [videoClient, callId, isCaller, isVideoCall, callMode, chatClient]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3797F0" />
      </View>
    );
  }

  if (error) return <ErrorCallUI error={error} />;

  if (!call) return <ErrorCallUI error="Call unavailable" />;

  return (
    <StreamCall call={call}>
      <CallUI
        isCaller={isCaller}
        callMode={effectiveCallMode}
        displayNames={displayNames}
        remotePeer={remotePeer}
      />
    </StreamCall>
  );
};

function CallUI({
  isCaller,
  callMode,
  displayNames,
  remotePeer,
}: {
  isCaller: boolean;
  callMode: CallMode;
  displayNames: Record<string, string>;
  remotePeer: { name: string; image?: string };
}) {
  const isVideoCall = callMode === "video";
  const call = useCall();
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const isRinging =
    [CallingState.RINGING, CallingState.JOINING, CallingState.IDLE].includes(
      callingState,
    ) ||
    Boolean(
      call?.ringing &&
        callingState !== CallingState.JOINED &&
        callingState !== CallingState.LEFT,
    );

  useCallRingtone(
    callingState !== CallingState.JOINED &&
      callingState !== CallingState.LEFT,
    !isCaller,
  );

  // Caller auto-joins when callee accepts (Stream docs); ensure we join + publish.
  useEffect(() => {
    if (!call || !isCaller) return;

    const onAccepted = async (event: { user: { id?: string } }) => {
      if (event.user?.id === call.currentUserId) return;
      if (call.state.callingState === CallingState.JOINED) return;

      try {
        if (isVideoCall) {
          await call.camera.enable();
        } else {
          await call.camera.disable();
        }
        await call.microphone.enable();
        await call.join();
        callManager.start({
          audioRole: "communicator",
          deviceEndpointType: "speaker",
        });
      } catch (e) {
        console.error("Caller join on accept failed:", e);
      }
    };

    return call.on("call.accepted", onAccepted);
  }, [call, isCaller, isVideoCall]);

  useEffect(() => {
    if (!call || callingState !== CallingState.JOINED) return;
    callManager.start({
      audioRole: "communicator",
      deviceEndpointType: "speaker",
    });
  }, [call, callingState]);

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      callManager.stop();
      router.back();
    }
  }, [callingState, router]);

  if (isRinging) {
    return (
      <BroadcastRingingCall
        remoteName={remotePeer.name}
        remoteImage={remotePeer.image}
        isCaller={isCaller}
        isVideoCall={isVideoCall}
        controls={
          isCaller ? (
            <BroadcastOutgoingCallControls onDone={() => router.back()} />
          ) : (
            <BroadcastIncomingCallControls
              isVideoCall={isVideoCall}
              onDone={() => router.back()}
            />
          )
        }
      />
    );
  }

  if (!isVideoCall) {
    return (
      <SafeAreaView style={styles.activeRoot}>
        <View style={styles.audioCallBody}>
          <Ionicons name="call" size={48} color="rgba(255,255,255,0.9)" />
          <Text style={styles.audioCallLabel}>{remotePeer.name}</Text>
          <Text style={styles.audioCallSub}>Voice call</Text>
        </View>
        <BroadcastActiveCallControls
          showCamera={false}
          onHangup={async () => {
            if (call?.isCreatedByMe) {
              await call.endCall();
            } else {
              await call?.leave();
            }
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.activeRoot}>
      <CallContent
        layout="spotlight"
        ParticipantLabel={(props) => (
          <BroadcastParticipantLabel
            {...props}
            displayNames={displayNames}
          />
        )}
        CallControls={() => (
          <BroadcastActiveCallControls
            showCamera
            onHangup={async () => {
              if (call?.isCreatedByMe) {
                await call.endCall();
              } else {
                await call?.leave();
              }
              router.back();
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

export default CallScreen;

function ErrorCallUI({ error }: { error: string }) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.ringingRoot, { backgroundColor: theme.background }]}
    >
      <View style={styles.errorBox}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <Pressable
          style={[styles.errorBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.errorBtnText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0f",
  },
  ringingRoot: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  activeRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  audioCallBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  audioCallLabel: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  audioCallSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorText: { textAlign: "center", fontSize: 15 },
  errorBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: { color: "#fff", fontWeight: "700" },
});