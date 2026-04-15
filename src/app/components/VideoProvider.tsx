import { COLORS } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import type { Call } from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let StreamVideo: any = null;
let StreamVideoClient: any = null;
let useCalls: any = null;
let StreamCall: any = null;
let RingingCallContent: any = null;

// we require it inside try-catch so the app keeps working when the SDK isn’t there.
// i.e. in Expo Go this is not available - so instead of crashing, we just don't show the video features.
try {
  const sdk = require("@stream-io/video-react-native-sdk");
  StreamVideo = sdk.StreamVideo;
  StreamVideo = sdk.StreamVideo;
  StreamVideoClient = sdk.StreamVideoClient;
  useCalls = sdk.useCalls;
  StreamCall = sdk.StreamCall;
  RingingCallContent = sdk.RingingCallContent;
} catch (error) {
  console.log("Error while importing @stream-io/video-react-native-sdk", error);
  // native module not available (e.g. Expo Go) — video will be disabled
}
const API_URL = "https://cast-api-zeta.vercel.app";

// double bang operator
const sdkAvailable = !!StreamVideoClient && !!StreamVideo;
const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

/* listens for incoming ringing calls globally and shows the ringing UI. only mounted when useCalls is available. */
function RingingCalls() {
  const calls = useCalls().filter((c: Call) => c.ringing);
  const ringingCalls = calls[0];

  if (!ringingCalls) return null;

  return (
    <StreamCall call={ringingCalls}>
      <SafeAreaView style={StyleSheet.absoluteFill}>
        <RingingCallContent />
      </SafeAreaView>
    </StreamCall>
  );
}

const VideoProvider = ({ children }: { children: React.ReactNode }) => {
  const [videoClient, setVideoClient] = useState<any>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!sdkAvailable || !isLoaded || !user) return;

    const tokenProvider = async () => {
      const response = await fetch(`${API_URL}/api/stream/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      return data.token;
    };

    const client = StreamVideoClient.getOrCreateInstance({
      apiKey,
      user: {
        id: user.id,
        name: user.fullName ?? user.username ?? "Guest",
        image: user.imageUrl,
      },
      tokenProvider,
    });

    setVideoClient(client);

    // cleanup aka better performance
    return () => {
      client.disconnectUser();
      setVideoClient(null);
    };
  }, [isLoaded, user]);

  // SDK not available (Expo Go) — pass through
  if (!sdkAvailable) return <>{children}</>;

  // not authenticated — pass through (auth screens)
  if (!isLoaded || !user) return <>{children}</>;

  if (!videoClient) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <StreamVideo client={videoClient}>
      {children}
      {useCalls && <RingingCalls />}
    </StreamVideo>
  );
};

export default VideoProvider;
