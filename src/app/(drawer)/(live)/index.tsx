import React, { useState, useEffect } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
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

type Session = {
  callId: string;
  isHost: boolean;
};

export default function App() {
  const { userDetails } = useLevel();
  const { isDark, theme } = useTheme();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  // Host flow (create)
  const startAsHost = (id: string) => {
    setSession({ callId: id, isHost: true });
  };

  // Viewer flow (join existing)
  const joinAsViewer = (id: string) => {
    setSession({ callId: id, isHost: false });
  };

  const goToHomeScreen = () => setSession(null);

  useEffect(() => {
    let mounted = true;

    const initClient = async () => {
      if (!userDetails) {
        setBooting(false);
        return;
      }

      try {
        const token = await tokenProvider(userDetails.clerkId);
        if (!token) return;

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
        console.error("Failed to initialize StreamVideoClient", err);
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
          {session ? (
            <LiveScreen
              goToHomeScreen={goToHomeScreen}
              callId={session.callId}
              isHost={session.isHost}
            />
          ) : (
            <HomeScreen
              client={client}
              joinCall={joinAsViewer}
              liveScreen={startAsHost}
            />
          )}
        </StreamVideo>
      )}
    </SafeAreaView>
  );
}