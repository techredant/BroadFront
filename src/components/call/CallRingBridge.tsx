import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useAgoraRtc } from "@/rtc/AgoraRtcContext";
import { fetchIncomingRings } from "@/rtc/agoraApi";
import type { CallRingPayload } from "@/rtc/types";
import { useLevel } from "@/context/LevelContext";
import { SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import {
  useIncomingCall,
  type IncomingCallPayload,
} from "@/components/notifications/IncomingCallOverlay";
import { callModeFromRingEvent } from "@/utils/callMode";
import {
  isUserBusyInAnotherCall,
  rejectRingingCall,
} from "@/utils/callBusy";
import { callDebug } from "@/utils/callDebug";
import { prewarmIncomingCall } from "@/utils/callMedia";
import { displayIncomingCallNotification } from "@/utils/notifeeNotifications";

const HOSTED_RING_POLL_MS = 2500;

function ringKeyFor(event: CallRingPayload) {
  return `${event.channelName}:${event.callerId}:${event.rungAt ?? ""}`;
}

function payloadFromRing(event: CallRingPayload): IncomingCallPayload {
  return {
    callId: event.channelName,
    callerName: event.callerName || "Incoming call",
    callerImage: event.callerImage ?? undefined,
    callMode: callModeFromRingEvent(event),
  };
}

/** App-wide Agora `call:ring` handler — incoming overlay on any screen. */
export function CallRingBridge() {
  const { user } = useUser();
  const { client, lastRingEvent, clearRingEvent, socket } = useAgoraRtc();
  const { userDetails } = useLevel();
  const { showIncomingCall, dismissIncomingCall, incomingCall } = useIncomingCall();
  const showIncomingRef = useRef(showIncomingCall);
  showIncomingRef.current = showIncomingCall;
  const clerkId = userDetails?.clerkId ?? user?.id;
  const clerkIdRef = useRef(clerkId);
  clerkIdRef.current = clerkId;
  const handledRingRef = useRef<string | null>(null);

  const presentRing = useCallback(
    (event: CallRingPayload) => {
      const myId = clerkIdRef.current;
      if (!myId) return false;
      if (event.callerId === myId) return true;

      const ringKey = ringKeyFor(event);
      if (handledRingRef.current === ringKey) return true;
      handledRingRef.current = ringKey;

      const payload = payloadFromRing(event);

      if (client && isUserBusyInAnotherCall(client, payload.callId)) {
        void rejectRingingCall(client, payload.callId, "busy");
        return true;
      }

      callDebug.log("ring", { callId: payload.callId, from: event.callerId });
      showIncomingRef.current(payload);
      if (client) {
        prewarmIncomingCall(client, payload.callId);
      }

      if (Platform.OS === "android") {
        void displayIncomingCallNotification({
          callId: payload.callId,
          title: payload.callerName || "Incoming call",
          body:
            payload.callMode === "audio"
              ? "Incoming voice call"
              : "Incoming video call",
          callMode: payload.callMode ?? "video",
          callerImage: payload.callerImage,
        }).catch(() => {});
      }

      return true;
    },
    [client],
  );

  useEffect(() => {
    if (!lastRingEvent) return;

    const handled = presentRing(lastRingEvent);
    if (handled || clerkIdRef.current) {
      clearRingEvent();
    }
  }, [lastRingEvent, presentRing, clearRingEvent, clerkId]);

  useEffect(() => {
    if (!SOCKET_IO_DISABLED_ON_HOST || !clerkId) return;

    let cancelled = false;

    const poll = async () => {
      const rings = await fetchIncomingRings(clerkId);
      if (cancelled || rings.length === 0) return;

      for (const raw of rings) {
        const event = raw as CallRingPayload;
        if (!event.channelName || !event.callerId) continue;
        presentRing(event);
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, HOSTED_RING_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [clerkId, presentRing]);

  useEffect(() => {
    if (!socket) return;

    const onEnded = (payload: { channelName?: string }) => {
      const channelName = payload.channelName;
      if (!channelName) return;

      if (incomingCall?.callId === channelName) {
        dismissIncomingCall();
      }

      const prefix = `${channelName}:`;
      if (handledRingRef.current?.startsWith(prefix)) {
        handledRingRef.current = null;
      }
    };

    socket.on("call:ended", onEnded);
    return () => {
      socket.off("call:ended", onEnded);
    };
  }, [socket, dismissIncomingCall, incomingCall?.callId]);

  return null;
}
