import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";
import { fetchStreamToken } from "@/utils/streamToken";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

export default function StreamLayout() {
  const { userDetails } = useLevel();
  const router = useRouter();

  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!userDetails?.clerkId) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      try {
        const displayName =
          `${userDetails.firstName ?? ""} ${userDetails.lastName ?? ""} ${userDetails.companyName ?? ""} ${userDetails.nickName ?? ""}`.trim();

        const client = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: {
            id: userDetails.clerkId,
            name: displayName || userDetails.clerkId,
            image: userDetails.image,
          },
          tokenProvider: () =>
            fetchStreamToken({
              userId: userDetails.clerkId,
              name: displayName,
              image: userDetails.image,
            }),
        });

        unsubscribe = client.on("call.ring", (event) => {
          const callId = event.call_cid?.split(":")[1];
          if (!callId) return;

          const custom = event.call?.custom as { callMode?: string } | undefined;
          const callMode =
            custom?.callMode === "audio" ? "audio" : "video";

          router.push({
            pathname: "/(drawer)/(stream)/call/[callId]",
            params: {
              callId,
              isCaller: "false",
              callMode,
            },
          });
        });

        if (!cancelled) {
          clientRef.current = client;
          setVideoClient(client);
        }
      } catch (err) {
        console.error("Failed to initialize Stream Video:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribe?.();
      clientRef.current?.disconnectUser().catch(() => {});
      clientRef.current = null;
    };
  }, [userDetails?.clerkId, router]);

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
