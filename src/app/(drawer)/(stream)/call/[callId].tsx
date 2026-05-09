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

import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";

const CallScreen = () => {
  const { callId } = useLocalSearchParams<{ callId: string }>();

  const videoClient = useStreamVideoClient();

  const { client: chatClient } = useChatContext();

  const [call, setCall] = useState<Call | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isCaller, setIsCaller] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    if (!videoClient || !callId) return;

    const startCall = async () => {
      try {
        // chat channel
        const channel = chatClient.channel("messaging", callId);

        await channel.watch();

        // create call
        const _call = videoClient.call("default", callId);

        // exclude current user from ringing users
        const members = Object.values(channel.state.members)
          .filter((member) => member.user?.id !== chatClient.user?.id)
          .map((member) => ({
            user_id: member.user?.id as string,
          }));

        // mark THIS device as caller immediately
        setIsCaller(true);

        await _call.getOrCreate({
          ring: true,

          data: {
            members,
          },
        });

        setCall(_call);
      } catch (err) {
        console.error("Failed to start call:", err);

        setError("Failed to start the call. Try again");
      }
    };

    startCall();
  }, [videoClient, callId]);

  if (error) {
    return <ErrorCallUI error={error} />;
  }

  if (!call) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="small" color="white" />

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
        <CallUI isCaller={isCaller} />
      </StreamCall>
    </SafeAreaView>
  );
};

function CallUI({ isCaller }: { isCaller: boolean }) {
  const router = useRouter();

  const { useCallCallingState } = useCallStateHooks();

  const callingState = useCallCallingState();

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      router.back();
    }
  }, [callingState]);

  // 👇 RECEIVER only
  if (callingState === CallingState.RINGING && !isCaller) {
    return <IncomingCall />;
  }

  // 👇 CALLER NEVER sees ringing
  if (isCaller && callingState !== CallingState.JOINED) {
    return <OutgoingCall />;
  }

  return (
    <View style={{ flex: 1 }}>
      <CallContent />
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
