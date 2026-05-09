import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";

import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";


const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

export default function AppLayout() {
  const { userDetails } = useLevel();

  const [client, setClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!userDetails) return;

    const init = async () => {
      const res = await fetch(
        "https://cast-api-zeta.vercel.app/api/stream/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userDetails.clerkId,
            name: `${userDetails.firstName} ${userDetails.lastName} ${userDetails.companyName}`,
            image: userDetails.image,
          }),
        },
      );

      const data = await res.json();

      const videoClient = StreamVideoClient.getOrCreateInstance({
        apiKey,

        user: {
          id: userDetails.clerkId,
          name: `${userDetails.firstName} ${userDetails.lastName} ${userDetails.companyName}`,
          image: userDetails.image,
        },

        token: data.token,
      });

      setClient(videoClient);
    };

    init();

    return () => {
      client?.disconnectUser();
    };
  }, [userDetails]);

  if (!client) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <StreamVideo client={client}>
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
