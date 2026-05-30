import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCall, useCallStateHooks } from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";

/**
 * Surfaces Agora RTC reconnecting state.
 */
export function StreamConnectionOverlay() {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [retrying, setRetrying] = useState(false);

  const onRetry = useCallback(async () => {
    if (!call) return;
    setRetrying(true);
    try {
      await call.join();
    } catch (err) {
      console.warn("[RTC] manual reconnect failed:", err);
    } finally {
      setRetrying(false);
    }
  }, [call]);

  if (callingState !== RtcConnectionState.RECONNECTING) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.card}>
        <ActivityIndicator color="#fff" style={styles.spinner} />
        <Text style={styles.text}>Reconnecting, please wait…</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => void onRetry()}
          disabled={retrying}
        >
          <Text style={styles.retryText}>
            {retrying ? "Retrying…" : "Try again"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 50,
  },
  card: {
    maxWidth: 300,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(20,20,20,0.92)",
    alignItems: "center",
  },
  spinner: {
    marginBottom: 10,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#3797F0",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
