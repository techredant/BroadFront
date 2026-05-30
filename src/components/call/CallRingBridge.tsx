import { useEffect, useRef } from "react";
import { useStreamVideoClient } from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";
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

/** App-wide Stream `call.ring` handler — incoming overlay on any screen. */
export function CallRingBridge() {
  const videoClient = useStreamVideoClient();
  const { userDetails } = useLevel();
  const { showIncomingCall } = useIncomingCall();
  const showIncomingRef = useRef(showIncomingCall);
  showIncomingRef.current = showIncomingCall;
  const clerkIdRef = useRef(userDetails?.clerkId);
  clerkIdRef.current = userDetails?.clerkId;

  useEffect(() => {
    if (!videoClient) return;

    const presentIncoming = (payload: IncomingCallPayload) => {
      if (isUserBusyInAnotherCall(videoClient, payload.callId)) {
        void rejectRingingCall(videoClient, payload.callId, "busy");
        return;
      }

      showIncomingRef.current(payload);

      if (payload.callMode !== "audio") {
        prewarmIncomingCall(videoClient, payload.callId, true);
      }
    };

    const unsubscribe = videoClient.on("call.ring", (event) => {
      const callId = event.call_cid?.split(":")[1];
      if (!callId) return;

      const myId = clerkIdRef.current;
      const custom = event.call?.custom as { triggeredBy?: string } | undefined;
      if (!myId || custom?.triggeredBy === myId || event.user?.id === myId) {
        return;
      }

      callDebug.log("ring", { callId, from: event.user?.id });

      presentIncoming({
        callId,
        callerName: event.user?.name || "Incoming call",
        callerImage: event.user?.image,
        callMode: callModeFromRingEvent(event),
      });
    });

    return unsubscribe;
  }, [videoClient]);

  return null;
}
