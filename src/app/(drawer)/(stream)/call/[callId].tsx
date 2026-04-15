import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  CallContent,
  CallingState,
  IncomingCall,
  OutgoingCall,
  StreamCall,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <StreamCall call={call}>
        <CallUI />
      </StreamCall>
    </SafeAreaView>
  );
};

function CallUI() {
  const call = useCall();
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  const isCallCreatedByMe = call?.isCreatedByMe ?? false;

  useEffect(() => {
    if (callingState === CallingState.LEFT) router.back();
  }, [callingState, router, call]);

  // show ringing UI for RINGING, JOINING, and IDLE states
  if (
    [CallingState.RINGING, CallingState.JOINING, CallingState.IDLE].includes(
      callingState,
    )
  ) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {isCallCreatedByMe ? <OutgoingCall /> : <IncomingCall />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <CallContent
        onHangupCallHandler={async () => {
          await call?.endCall();
        }}
        layout="spotlight"
      />
    </SafeAreaView>
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
