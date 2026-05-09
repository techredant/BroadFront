import React, { useEffect, useState } from "react";
import { AudioRoomUI } from "./AudioRoomUI";
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from "react-native";
import {
  Call,
  StreamCall,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const CallScreen = () => {
  const params = useLocalSearchParams<{ callId?: string | string[] }>();
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;

  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useStreamVideoClient();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!client) return;
  
    if (!callId) {
      setError("Missing room id.");
      return;
    }
  
    let isMounted = true;
    let joined = false;
  
    const myCall = client.call("audio_room", callId);
  
    const joinCall = async () => {
      try {
        setError(null);
  
        await myCall.join({
          create: true,
        });
  
        joined = true;
  
        if (isMounted) {
          setCall(myCall);
        }
      } catch (e) {
        console.error("Join error:", e);
  
        if (isMounted) {
          setError("Failed to join audio room.");
        }
      }
    };
  
    joinCall();
  
    return () => {
      isMounted = false;
  
      if (joined) {
        myCall.leave().catch(() => {});
      }
    };
  }, [client, callId]);

  

  const goBack = () => {
    router.back();
  };

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Ionicons name="alert-circle-outline" size={44} color={theme.danger} />
        <Text
          style={{
            marginTop: 12,
            color: theme.text,
            textAlign: "center",
            fontSize: 15,
          }}
        >
          {error}
        </Text>

        <Pressable
          onPress={goBack}
          style={{
            marginTop: 16,
            backgroundColor: theme.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

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
        <Text style={{ marginTop: 12, color: theme.text }}>Joining Audio Room...</Text>
      </View>
    );
  }

  return (
    <StreamCall call={call}>
      <View style={styles.container}>
        <AudioRoomUI goToHomeScreen={goBack} />
      </View>
    </StreamCall>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});