import React, { useEffect } from "react";
import { AudioRoomUI } from "./AudioRoomUI";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import {
  Call,
  StreamCall,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

type Props = { goToHomeScreen: () => void };

export const CallScreen = ({ goToHomeScreen }: Props) => {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [call, setCall] = React.useState<Call>();
  const client = useStreamVideoClient();
  const { theme } = useTheme();
  const hasJoinedRef = React.useRef(false);

  useEffect(() => {
    if (!client || !callId) return;

    let isMounted = true;

    const myCall = client.call("audio_room", callId);

    const joinCall = async () => {
      try {
        await myCall.join();
        if (isMounted) {
          setCall(myCall);
        }
      } catch (error) {
        console.error("Join error:", error);
      }
    };

    joinCall();

    return () => {
      isMounted = false;

      // 🔥 Only leave if call exists and is joined
      if (myCall) {
        myCall.leave().catch(() => {});
      }
    };
  }, [client, callId]);

  if (!call) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="small" color={theme.text} />
        <Text style={{ marginTop: 12, color: theme.text }}>
          Joining Audio Room...
        </Text>
      </View>
    );
  }
  return (
    <StreamCall call={call}>
      <View style={styles.container}>
        <AudioRoomUI goToHomeScreen={goToHomeScreen} />
      </View>
    </StreamCall>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    textAlign: "center",
  },
});
