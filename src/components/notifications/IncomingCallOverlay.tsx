import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useCallRingtone } from "@/hooks/useCallRingtone";
import { getCallVideoClient } from "@/utils/callSessionRegistry";
import { rejectRingingCall } from "@/utils/callBusy";
import { cancelIncomingCallNotification } from "@/utils/notifeeNotifications";
import { callDebug } from "@/utils/callDebug";
import { joinCallWithMedia } from "@/utils/callMedia";

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
  acceptIncomingCall: (payload?: IncomingCallPayload) => Promise<void>;
  declineIncomingCall: (payload?: IncomingCallPayload) => Promise<void>;
};

const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

function IncomingCallModal({
  incomingCall,
  onAccept,
  onDecline,
}: {
  incomingCall: IncomingCallPayload;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { isDark } = useTheme();

  useCallRingtone(true, true);

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDecline}
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
            <Pressable style={[styles.btn, styles.decline]} onPress={onDecline}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Pressable style={[styles.btn, styles.accept]} onPress={onAccept}>
              <Ionicons name="call" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const showIncomingCall = useCallback((payload: IncomingCallPayload) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIncomingCall((current) => current ?? payload);
  }, []);

  const acceptIncomingCall = useCallback(
    async (payload?: IncomingCallPayload) => {
      const call = payload ?? incomingCall;
      if (!call) return;

      dismissIncomingCall();
      await cancelIncomingCallNotification(call.callId).catch(() => {});

      const client = getCallVideoClient();
      if (client) {
        try {
          const streamCall = client.call("default", call.callId, {
            reuseInstance: true,
          });
          if (!streamCall.ringing) {
            await streamCall
              .get({ ring: true, video: call.callMode !== "audio" })
              .catch(() => {});
          }
          await joinCallWithMedia(streamCall, call.callMode !== "audio");
        } catch (err) {
          callDebug.warn("accept-incoming-join-failed", err);
        }
      }

      router.push({
        pathname: "/(drawer)/(stream)/call/[callId]",
        params: {
          callId: call.callId,
          isCaller: "false",
          callMode: call.callMode ?? "video",
        },
      } as never);
    },
    [dismissIncomingCall, incomingCall, router],
  );

  const declineIncomingCall = useCallback(
    async (payload?: IncomingCallPayload) => {
      const call = payload ?? incomingCall;
      if (!call) return;

      dismissIncomingCall();
      const client = getCallVideoClient();
      if (client) {
        await rejectRingingCall(client, call.callId, "decline");
      }
      await cancelIncomingCallNotification(call.callId).catch(() => {});
      callDebug.log("decline-incoming", call.callId);
    },
    [dismissIncomingCall, incomingCall],
  );

  const value = useMemo(
    () => ({
      incomingCall,
      showIncomingCall,
      dismissIncomingCall,
      acceptIncomingCall,
      declineIncomingCall,
    }),
    [
      incomingCall,
      showIncomingCall,
      dismissIncomingCall,
      acceptIncomingCall,
      declineIncomingCall,
    ],
  );

  return (
    <IncomingCallContext.Provider value={value}>
      {children}
      {incomingCall ? (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={() => void acceptIncomingCall()}
          onDecline={() => void declineIncomingCall()}
        />
      ) : null}
    </IncomingCallContext.Provider>
  );
}

export function useIncomingCall() {
  const ctx = useContext(IncomingCallContext);
  if (!ctx) {
    throw new Error("useIncomingCall must be used inside IncomingCallProvider");
  }
  return ctx;
}

/** @deprecated Use useIncomingCall */
export function useIncomingCallOverlay() {
  return useIncomingCall();
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
