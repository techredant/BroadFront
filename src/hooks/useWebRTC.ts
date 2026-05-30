import { useCallback, useEffect, useRef, useState } from "react";
import type { RtcCall } from "@/rtc/RtcCall";
import { callManager } from "@/rtc";
import { callDebug } from "@/utils/callDebug";

export type AudioRoute = "speaker" | "earpiece";

/** Audio route + camera flip only — media publish lives in joinCallWithMedia. */
export function useWebRTC(
  call: RtcCall | null | undefined,
  isVideoCall: boolean,
  isActive: boolean,
) {
  const [audioRoute, setAudioRoute] = useState<AudioRoute>(
    isVideoCall ? "speaker" : "earpiece",
  );
  const audioRouteRef = useRef(audioRoute);
  audioRouteRef.current = audioRoute;

  const applyAudioRoute = useCallback(
    (route: AudioRoute) => {
      if (!call || !isActive) return;
      try {
        callManager.start({
          audioRole: "communicator",
          deviceEndpointType: route,
        });
        setAudioRoute(route);
        callDebug.log("audio-route", route);
      } catch (err) {
        callDebug.warn("audio-route-failed", err);
      }
    },
    [call, isActive],
  );

  const toggleSpeaker = useCallback(() => {
    applyAudioRoute(
      audioRouteRef.current === "speaker" ? "earpiece" : "speaker",
    );
  }, [applyAudioRoute]);

  const flipCamera = useCallback(async () => {
    if (!call || !isVideoCall) return;
    try {
      call.switchCamera();
      callDebug.log("camera-flip");
    } catch (err) {
      callDebug.warn("camera-flip-failed", err);
    }
  }, [call, isVideoCall]);

  useEffect(() => {
    if (!call || !isActive) return;
    applyAudioRoute(isVideoCall ? "speaker" : "earpiece");
  }, [applyAudioRoute, call, isActive, isVideoCall]);

  return {
    audioRoute,
    permissionError: null,
    toggleSpeaker,
    flipCamera,
  };
}
