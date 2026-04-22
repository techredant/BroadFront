import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import type { Call } from "@stream-io/video-react-native-sdk";

const API_URL = "https://cast-api-zeta.vercel.app";
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

// 🔐 Token provider
async function getStreamToken(userDetail: any) {
  const res = await fetch(`${API_URL}/api/stream/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: userDetail?.clerkId,
      name: `${userDetail?.firstName ?? ""} ${userDetail?.lastName ?? ""} ${userDetail?.nickName ?? ""}`.trim(),
      image: userDetail?.imageUrl,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token fetch failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.token) {
    throw new Error("No token returned from backend");
  }

  return data.token;
}

// SDK safe import (Expo Go protection)
let StreamVideo: any = null;
let StreamVideoClient: any = null;
let useCalls: any = null;
let StreamCall: any = null;
let RingingCallContent: any = null;

try {
  const sdk = require("@stream-io/video-react-native-sdk");
  StreamVideo = sdk.StreamVideo;
  StreamVideoClient = sdk.StreamVideoClient;
  useCalls = sdk.useCalls;
  StreamCall = sdk.StreamCall;
  RingingCallContent = sdk.RingingCallContent;
} catch (e) {
  console.log("Video SDK not available");
}

const sdkAvailable = !!StreamVideoClient && !!StreamVideo;

type VideoWrapperProps = {
  userDetail: any;
  children: React.ReactNode;
};

// 🔔 Incoming calls UI
function RingingCalls() {
  if (!useCalls) return null;

  const calls = useCalls().filter((c: Call) => c.ringing);
  const ringingCall = calls?.[0];

  if (!ringingCall) return null;

  return (
    <StreamCall call={ringingCall}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <RingingCallContent />
      </SafeAreaView>
    </StreamCall>
  );
}

const VideoProvider = ({ userDetail, children }: VideoWrapperProps) => {
  const { user, isLoaded } = useUser();

  const prevUserId = useRef<string | null>(null);
  const [videoClient, setVideoClient] = useState<any>(null);

  useEffect(() => {
    if (!sdkAvailable || !isLoaded || !user || !userDetail) return;

    const initClient = async () => {
      const client = StreamVideoClient.getOrCreateInstance({
        apiKey: STREAM_API_KEY,

        user: {
          id: userDetail.clerkId,
          name: `${userDetail.firstName ?? ""} ${userDetail.lastName ?? ""} ${userDetail.nickName ?? ""}`.trim(),
          image: userDetail.imageUrl,
        },

        tokenProvider: async () => {
          return await getStreamToken(userDetail);
        },
      });

      setVideoClient(client);
    };

    initClient();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser();
      }
      setVideoClient(null);
    };
  }, [userDetail?.clerkId, isLoaded, user]);

  // 🔁 user switching guard (same pattern as ChatWrapper)
  useEffect(() => {
    if (!videoClient || !userDetail?.clerkId) return;

    if (prevUserId.current && prevUserId.current !== userDetail.clerkId) {
      console.log("🔌 Switching users, disconnecting video client...");
      videoClient.disconnectUser();
    }

    prevUserId.current = userDetail.clerkId;
  }, [userDetail?.clerkId, videoClient]);

  // SDK fallback
  if (!sdkAvailable) return <>{children}</>;

  // auth loading fallback
  if (!isLoaded || !user) return <>{children}</>;

  // loading client UI
  if (!videoClient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
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
