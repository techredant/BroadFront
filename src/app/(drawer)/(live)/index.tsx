import React, { useState, useEffect, useMemo } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { HomeScreen } from "./src/HomeLivescreen";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { tokenProvider } from "@/utils/tokenProvider";
import LiveScreen from "./src/LiveScreen";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;
// Generate a unique call ID for each live session

export default function App() {
  const { userDetails, currentLevel } = useLevel();
  const [activeScreen, setActiveScreen] = useState<"home" | "call-screen">(
    "home",
  );
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const { isDark, theme } = useTheme();

  const joinCall = (id: string) => {
    setSelectedCallId(id);
    setActiveScreen("call-screen");
  };

  // Create callId dynamically based on currentLevel
  // Only compute callId if userDetails exist
  const callId = useMemo(() => {
    if (!userDetails) return "audio_room_national"; // fallback
    return `audio_room_${currentLevel?.value || userDetails.county || "home"}_${userDetails.clerkId}`;
  }, [currentLevel, userDetails]);

  // Initialize StreamVideoClient after userDetails is ready
  useEffect(() => {
    if (!userDetails) return;

    const initClient = async () => {
      try {
        const token = await tokenProvider(userDetails.clerkId);
        if (!token) return;

        const user = {
          id: userDetails.clerkId,
          name: userDetails.nickName || "Unknown",
          image: `${userDetails.image}?id=${userDetails.clerkId}&name=${userDetails.nickName}`,
        };

        const newClient = new StreamVideoClient({ apiKey, user, token });
        setClient(newClient);
      } catch (err) {
        console.error("Failed to initialize StreamVideoClient", err);
      }
    };

    initClient();
  }, [userDetails]);

  const goToHomeScreen = () => setActiveScreen("home");

  if (!client) return null; // wait until token & client are ready

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      {!client ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <StreamVideo client={client}>
          {activeScreen === "call-screen" && selectedCallId ? (
            <LiveScreen
              goToHomeScreen={goToHomeScreen}
              callId={selectedCallId}
            />
          ) : (
            // <HomeScreen client={client} joinCall={joinCall} />
            <HomeScreen
              client={client}
              joinCall={joinCall}
              liveScreen={joinCall}
            />
          )}
        </StreamVideo>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: "#F9FAFB", // clean light background
  },
});
