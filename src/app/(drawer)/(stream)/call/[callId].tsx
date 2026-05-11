
import { useTheme } from "@/context/ThemeContext";
import { useCallRingtone } from "@/hooks/useCallRingtone";
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
    const { callId, isCaller: callerParam } = useLocalSearchParams<{
      callId: string;
      isCaller: string;
    }>();
     const isCaller = callerParam === "true";
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

        const members = Object.values(channel.state.members)
          .filter((member) => member.user?.id !== chatClient.user?.id)
          .map((member) => ({
            user_id: member.user?.id as string,
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

  if (!call) return null;

  return (
    <StreamCall call={call}>
      <CallUI isCaller={isCaller} />
    </StreamCall>
  );
};

function CallUI({ isCaller }: { isCaller: boolean }) {
  const call = useCall();
  const router = useRouter();
  const { useCallCallingState } = useCallStateHooks();

  const callingState = useCallCallingState();

  // RINGTONES
  useCallRingtone(
    callingState !== CallingState.JOINED && callingState !== CallingState.LEFT,
    !isCaller,
  );

  //   // CLOSE WHEN CALL ENDS
    useEffect(() => {
      if (callingState === CallingState.LEFT) {
        router.back();
      }
    }, [callingState]);

  if (
    [CallingState.RINGING, CallingState.JOINING, CallingState.IDLE].includes(
      callingState,
    )
  ) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {isCaller ? <OutgoingCall /> : <IncomingCall />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
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
  const { theme } = useTheme();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4">
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text className="mt-2 text-base text-foreground">{error}</Text>
        <Pressable className="mt-4 rounded-xl bg-primary px-6 py-3" onPress={() => router.back()}>
          <Text className="text-[15px] font-semibold text-foreground">Go Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
