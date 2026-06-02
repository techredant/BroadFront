import { useEffect } from "react";
import { useCall, useCallStateHooks } from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";
import { configureLivestreamViewerMedia } from "@/utils/callMedia";

type NetworkTier = "good" | "constrained" | "poor";

/**
 * When a livestream goes live, auto-join if the call is still IDLE.
 */
export function LivestreamAutoJoin({
  isHost,
  networkTier = "good",
}: {
  isHost: boolean;
  networkTier?: NetworkTier;
}) {
  const call = useCall();
  const { useIsCallLive, useCallCallingState } = useCallStateHooks();
  const isLive = useIsCallLive();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (isHost || !call || !isLive) return;
    if (callingState !== RtcConnectionState.IDLE) return;

    void call
      .join({ create: false, maxJoinRetries: 3, role: "audience", video: false })
      .then(() => {
        configureLivestreamViewerMedia(call);
      })
      .catch((err) => {
        console.warn("[Live] auto-join failed:", err);
      });
  }, [call, isHost, isLive, callingState, networkTier]);

  useEffect(() => {
    if (isHost || !call) return;
    if (callingState !== RtcConnectionState.JOINED) return;
    configureLivestreamViewerMedia(call);
  }, [call, isHost, callingState, networkTier]);

  return null;
}
