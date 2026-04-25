import { COLORS } from "@/lib/theme";
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
  CallParticipantsList,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";

const CallScreen = () => {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const videoClient = useStreamVideoClient();
  const { client: chatClient } = useChatContext();

  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <ActivityIndicator size="large" color={COLORS.primary} />
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const isCallCreatedByMe = call?.isCreatedByMe ?? false;
  const {
    useCallCallingState,
    useParticipants,
    useMicrophoneState,
    useCameraState,
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const participants = useParticipants();

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

  useEffect(() => {
    if (callingState === CallingState.LEFT) router.back();
  }, [callingState, router]);

  // 🔥 DO NOT WRAP IN SafeAreaView
  if (
    [CallingState.RINGING, CallingState.JOINING, CallingState.IDLE].includes(
      callingState,
    )
  ) {
    return isCallCreatedByMe ? <OutgoingCall /> : <IncomingCall />;
  }

const mic = useMicrophoneState();
const cam = useCameraState();
  return (
    <View className="flex-1 bg-black">
      {/* 🎥 Participants (REQUIRED for your version) */}
      <CallParticipantsList participants={participants} />

      {/* 🎛 Bottom controls */}
      <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-6">
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
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
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
