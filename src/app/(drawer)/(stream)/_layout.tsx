// layout.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";

import { useLevel } from "@/context/LevelContext";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

export default function AppLayout() {
  const { userDetails } = useLevel();

  const router = useRouter();

  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!userDetails) return;

    let unsubscribe: any;

    const init = async () => {
      try {
        const res = await fetch(
          "https://cast-api-zeta.vercel.app/api/stream/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userDetails.clerkId,
              name: `${userDetails.firstName} ${userDetails.lastName} ${userDetails.companyName} ${userDetails.nickName ?? ""}`.trim(),
              image: userDetails.image,
            }),
          },
        );

        const data = await res.json();

        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey,

          user: {
            id: userDetails.clerkId,
            name: `${userDetails.firstName} ${userDetails.lastName} ${userDetails.companyName} ${userDetails.nickName ?? ""}`.trim(),
            image: userDetails.image,
          },

          token: data.token,
        });

        // LISTEN FOR INCOMING CALLS
        unsubscribe = videoClient.on("call.ring", (event) => {
          const callId = event.call_cid?.split(":")[1];

          if (!callId) return;

          router.push({
            pathname: "/(drawer)/(stream)/call/[callId]",
            params: {
              callId,
              isCaller: "false",
            },
          });
        });

        setVideoClient(videoClient);
      } catch (err) {
        console.error("Failed to initialize Stream Video:", err);
      }
    };

    init();

return () => {
  unsubscribe?.();
  videoClient?.disconnectUser();
};
  }, [userDetails]);

  if (!videoClient) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <StreamVideo client={videoClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </StreamVideo>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
