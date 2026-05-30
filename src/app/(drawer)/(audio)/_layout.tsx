import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";
import { fetchStreamToken } from "@/utils/streamToken";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

export default function AudioLayout() {
  const { userDetails } = useLevel();
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);

  useEffect(() => {
    const clerkId = userDetails?.clerkId;
    if (!clerkId) return;

    let cancelled = false;

    const init = async () => {
      try {
        const displayName =
          `${userDetails.firstName ?? ""} ${userDetails.lastName ?? ""} ${userDetails.companyName ?? ""} ${userDetails.nickName ?? ""}`.trim() ||
          clerkId;

        const client = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: {
            id: clerkId,
            name: displayName,
            image: userDetails.image,
          },
          tokenProvider: () =>
            fetchStreamToken({
              userId: clerkId,
              name: displayName,
              image: userDetails.image,
            }),
        });

        if (!cancelled) {
          clientRef.current = client;
          setVideoClient(client);
        }
      } catch (err) {
        console.error("Failed to initialize audio Stream Video:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      clientRef.current = null;
    };
  }, [userDetails?.clerkId]);

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
