import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallRingtone } from "@/hooks/useCallRingtone";
import { getCallVideoClient } from "@/utils/callSessionRegistry";
import { rejectRingingCall } from "@/utils/callBusy";
import { cancelIncomingCallNotification } from "@/utils/notifeeNotifications";
import { callDebug } from "@/utils/callDebug";
import { prewarmIncomingCall } from "@/utils/callMedia";
import { setIncomingCallDispatcher } from "@/utils/incomingCallDispatch";

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
  const isVideo = incomingCall.callMode !== "audio";

  useCallRingtone(true, true);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onDecline}
    >
      <View style={styles.fullscreen}>
        <View style={styles.top}>
          {incomingCall.callerImage ? (
            <Image
              source={{ uri: incomingCall.callerImage }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={56} color="#fff" />
            </View>
          )}

          <Text style={styles.name}>{incomingCall.callerName || "Incoming call"}</Text>
          <Text style={styles.subtitle}>
            {isVideo ? "Incoming video call" : "Incoming voice call"}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionWrap} onPress={onDecline}>
            <View style={[styles.circleBtn, styles.decline]}>
              <Ionicons name="close" size={32} color="#fff" />
            </View>
            <Text style={styles.btnLabel}>Decline</Text>
          </Pressable>
          <Pressable style={styles.actionWrap} onPress={onAccept}>
            <View style={[styles.circleBtn, styles.accept]}>
              <Ionicons
                name={isVideo ? "videocam" : "call"}
                size={28}
                color="#fff"
              />
            </View>
            <Text style={styles.btnLabel}>Accept</Text>
          </Pressable>
        </View>
      </View>
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
    const client = getCallVideoClient();
    if (client) {
      prewarmIncomingCall(client, payload.callId);
    }
    setIncomingCall((current) => current ?? payload);
  }, []);

  useEffect(() => {
    setIncomingCallDispatcher(showIncomingCall);
    return () => setIncomingCallDispatcher(null);
  }, [showIncomingCall]);

  const acceptIncomingCall = useCallback(
    async (payload?: IncomingCallPayload) => {
      const call = payload ?? incomingCall;
      if (!call) return;

      dismissIncomingCall();
      void cancelIncomingCallNotification(call.callId).catch(() => {});

      // useCallManager is the sole join authority when accepted=true on the call screen.
      router.push({
        pathname: "/(drawer)/(stream)/call/[callId]",
        params: {
          callId: call.callId,
          isCaller: "false",
          callMode: call.callMode ?? "video",
          accepted: "true",
          peerName: call.callerName,
          ...(call.callerImage ? { peerImage: call.callerImage } : {}),
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
  fullscreen: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    justifyContent: "space-between",
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 24,
  },
  avatarFallback: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  name: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 56,
  },
  actionWrap: {
    alignItems: "center",
    gap: 10,
  },
  btnLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  circleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
