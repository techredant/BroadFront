import React, { useEffect, useMemo, useRef, useState } from "react";
import { AudioRoomUI } from "./AudioRoomUI";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import {
  Call,
  StreamCall,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const CallScreen = () => {
  const params = useLocalSearchParams<{
    callId?: string | string[];
    isHost?: string | string[];
  }>();
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const isHost =
    (Array.isArray(params.isHost) ? params.isHost[0] : params.isHost) === "true";

  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useStreamVideoClient();
  const { theme } = useTheme();
  const router = useRouter();
  const joinGenRef = useRef(0);

  const streamCall = useMemo(() => {
    if (!client || !callId) return null;
    return client.call("audio_room", callId);
  }, [client, callId]);

  useEffect(() => {
    if (!streamCall) {
      if (!callId) setError("Missing room id.");
      return;
    }

    const gen = ++joinGenRef.current;
    let active = true;

    const joinCall = async () => {
      try {
        setError(null);

        if (isHost) {
          await streamCall.getOrCreate();
          await streamCall.join({ create: true });
        } else {
          await streamCall.join({ create: false });
        }

        if (!active || joinGenRef.current !== gen) {
          await streamCall.leave().catch(() => {});
          return;
        }

        setCall(streamCall);
      } catch (e) {
        console.error("Join error:", e);
        if (active && joinGenRef.current === gen) {
          setError("Failed to join audio room.");
        }
      }
    };

    joinCall();

    return () => {
      active = false;
      const teardown = isHost ? streamCall.endCall() : streamCall.leave();
      void teardown.catch(() => {});
    };
  }, [streamCall, callId, isHost]);

  const goBack = () => {
    router.back();
  };

  if (!client && !error) {
    return (
      <View style={[styles.loading, { backgroundColor: "#0f0f0f" }]}>
        <ActivityIndicator size="small" color="#FE2C55" />
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

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
            fontSize: 14,
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
      <View style={[styles.loading, { backgroundColor: "#0f0f0f" }]}>
        <ActivityIndicator size="small" color="#FE2C55" />
        <Text style={styles.loadingText}>Joining room…</Text>
      </View>
    );
  }

  return (
    <StreamCall call={call}>
      <View style={styles.container}>
        <AudioRoomUI goToHomeScreen={goBack} isHost={isHost} />
      </View>
    </StreamCall>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "600",
  },
});
