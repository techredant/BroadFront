import React, { useState, useEffect } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { CallScreen } from "./src/CallScreen";
import { HomeScreen } from "./src/HomeScreen";
import { tokenProvider } from "@/utils/tokenProvider";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;
// Replace this with a real call ID or dynamically generate it
const callId = `audio_room_${Date.now()}`;

export default function App() {
  const { userDetails } = useLevel();
  const [activeScreen, setActiveScreen] = useState<"home" | "call-screen">(
    "home",
  );
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (!userDetails) return;

    const initClient = async () => {
      try {
        // Get token from your backend
        const token = await tokenProvider(userDetails.clerkId);

        if (!token) {
          console.error("No token returned from tokenProvider");
          return;
        }

        const user = {
          id: userDetails.clerkId,
          name: userDetails.nickName || "Unknown",
          image: `${userDetails.image}?id=${userDetails.clerkId}&name=${userDetails.nickName}`,
        };

        const newClient = new StreamVideoClient({ apiKey, user, token });
        setClient(newClient);

        console.log("StreamVideoClient initialized", newClient);
      } catch (err) {
        console.error("Failed to initialize StreamVideoClient", err);
      }
    };

    initClient();
  }, [userDetails]);

  const goToCallScreen = () => setActiveScreen("call-screen");
  const goToHomeScreen = () => setActiveScreen("home");

  if (!client) return null; // wait until token & client are ready

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StreamVideo client={client}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isDark ? "light-content" : "dark-content"}
        />
        {activeScreen === "call-screen" ? (
          <CallScreen goToHomeScreen={goToHomeScreen} callId={callId} />
        ) : (
          <HomeScreen goToCallScreen={goToCallScreen} />
        )}
      </StreamVideo>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    textAlign: "center",
  },
});
