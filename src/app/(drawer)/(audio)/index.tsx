import React, { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { HomeScreen } from "./src/HomeScreen";
import { tokenProvider } from "@/utils/tokenProvider";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

export default function AudioIndex() {
  const { userDetails } = useLevel();
  const { theme, isDark } = useTheme();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initClient = async () => {
      if (!userDetails) {
        if (mounted) setBooting(false);
        return;
      }

      try {
        const token = await tokenProvider(userDetails.clerkId);
        if (!token) {
          if (mounted) setBooting(false);
          return;
        }

        const user = {
          id: userDetails.clerkId,
          name: userDetails.nickName || "Unknown",
          image: userDetails.image
            ? `${userDetails.image}?id=${userDetails.clerkId}&name=${userDetails.nickName}`
            : undefined,
        };

        const newClient = new StreamVideoClient({ apiKey, user, token });

        if (!mounted) {
          newClient.disconnectUser();
          return;
        }

        setClient(newClient);
      } catch (err) {
        console.error("Failed to initialize audio StreamVideoClient", err);
      } finally {
        if (mounted) setBooting(false);
      }
    };

    initClient();

    return () => {
      mounted = false;
      setClient((prev) => {
        prev?.disconnectUser();
        return null;
      });
    };
  }, [userDetails]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {booting || !client ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="small" color={theme.text} />
        </View>
      ) : (
        <StreamVideo client={client}>
          <HomeScreen />
        </StreamVideo>
      )}
    </SafeAreaView>
  );
}