import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useCallRingtone } from "@/hooks/useCallRingtone";

export type IncomingCallPayload = {
  callId: string;
  callerName: string;
  callerImage?: string;
  callMode?: "audio" | "video";
};

type IncomingCallContextValue = {
  incomingCall: IncomingCallPayload | null;
  showIncomingCall: (payload: IncomingCallPayload) => void;
  dismissIncomingCall: () => void;
};

const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

function IncomingCallModal({
  incomingCall,
  onDismiss,
}: {
  incomingCall: IncomingCallPayload;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const { isDark } = useTheme();

  useCallRingtone(true, true);

  const acceptCall = () => {
    const { callId, callMode = "video" } = incomingCall;
    onDismiss();
    router.push({
      pathname: "/(drawer)/(stream)/call/[callId]",
      params: {
        callId,
        isCaller: "false",
        callMode,
      },
    } as any);
  };

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.backdrop}>
        <View style={styles.sheet}>
          {incomingCall.callerImage ? (
            <Image
              source={{ uri: incomingCall.callerImage }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color="#fff" />
            </View>
          )}

          <Text style={styles.name}>{incomingCall.callerName || "Incoming call"}</Text>
          <Text style={styles.subtitle}>
            {incomingCall.callMode === "audio"
              ? "Incoming voice call"
              : "Incoming video call"}
          </Text>

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.decline]} onPress={onDismiss}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Pressable style={[styles.btn, styles.accept]} onPress={acceptCall}>
              <Ionicons name="call" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const showIncomingCall = useCallback((payload: IncomingCallPayload) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIncomingCall(payload);
  }, []);

  const value = useMemo(
    () => ({ incomingCall, showIncomingCall, dismissIncomingCall }),
    [incomingCall, showIncomingCall, dismissIncomingCall],
  );

  return (
    <IncomingCallContext.Provider value={value}>
      {children}
      {incomingCall ? (
        <IncomingCallModal incomingCall={incomingCall} onDismiss={dismissIncomingCall} />
      ) : null}
    </IncomingCallContext.Provider>
  );
}

export function useIncomingCallOverlay() {
  const ctx = useContext(IncomingCallContext);
  if (!ctx) {
    throw new Error("useIncomingCallOverlay must be used inside IncomingCallProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 36,
  },
  actions: {
    flexDirection: "row",
    gap: 48,
  },
  btn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  decline: {
    backgroundColor: "#ef4444",
  },
  accept: {
    backgroundColor: "#22c55e",
  },
});
