import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  CallingState,
  IncomingCall,
  OutgoingCall,
  StreamCall,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
  CallContent,
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

const CallScreen = () => {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();

  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!videoClient || !callId) return;

    const startCall = async () => {
      try {
        // find channel by ID to find its members
        const channel = chatClient.channel("messaging", callId);
        await channel.watch();

        const _call = videoClient.call("default", callId);

        const members = Object.values(channel.state.members).map((member) => ({
          user_id: member?.user?.id as string,
        }));

        await _call.getOrCreate({
          ring: true,
          data: {
            members,
            custom: {
              triggeredBy: chatClient.user?.id,
            },
          },
        });

        setCall(_call);
      } catch (error) {
        console.error("Failed to start call:", error);
        setError("Failed to start the call. Try again");
      }
    };
    startCall();
    // eslint-disable-next-line
  }, []);

  if (error) return <ErrorCallUI error={error} />;

  if (!call) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="small" color={theme.text} />
          <Text className="mt-2 text-base text-foreground-muted">
            Starting call...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StreamCall call={call}>
        <CallUI />
      </StreamCall>
    </SafeAreaView>
  );
};

function CallUI() {
  const call = useCall();
  const router = useRouter();

  const { useCallCallingState, useMicrophoneState, useCameraState } =
    useCallStateHooks();

  const callingState = useCallCallingState();
  const mic = useMicrophoneState();
  const cam = useCameraState();

  useEffect(() => {
    if (callingState === CallingState.LEFT) router.back();
  }, [callingState]);

  if (callingState === CallingState.RINGING) {
    return <IncomingCall />;
  }

  if (callingState === CallingState.OUTGOING_CALL) {
    return <OutgoingCall />;
  }

  const ControlButton = ({
    icon,
    onPress,
    danger,
  }: {
    icon: any;
    onPress: () => void;
    danger?: boolean;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        className={`w-14 h-14 rounded-full items-center justify-center ${
          danger ? "bg-red-600" : "bg-white/20"
        }`}
      >
        <Ionicons name={icon} size={24} color={danger ? "white" : "white"} />
      </Pressable>
    );
  };

  // controls
  return (
    <View style={{ flex: 1 }}>
      <CallContent />

      <View
        style={{
          position: "absolute",
          bottom: 32,
          left: 24,
          right: 24,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingVertical: 10,
          backgroundColor: "rgba(0, 0, 0, 0.28)",
          borderRadius: 999,
          zIndex: 9999,
          elevation: 9999,
        }}
      >
        <ControlButton
          icon={mic?.isMute ? "mic-off-outline" : "mic-outline"}
          onPress={() => call?.microphone.toggle()}
        />

        <ControlButton
          icon={cam?.isEnabled ? "videocam-outline" : "videocam-off-outline"}
          onPress={() => call?.camera.toggle()}
        />

        <ControlButton
          icon="camera-reverse-outline"
          onPress={() => call?.camera.flip()}
        />

        <ControlButton
          icon="call-outline"
          danger
          onPress={() => call?.endCall()}
        />
      </View>
    </View>
  );
}
export default CallScreen;

function ErrorCallUI({ error }: { error: string }) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4">
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text className="mt-2 text-base text-foreground">{error}</Text>
        <Pressable
          className="mt-4 rounded-xl bg-primary px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-[15px] font-semibold text-foreground">
            Go Back
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
