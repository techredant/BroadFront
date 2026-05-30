import { useCallback, useEffect, useRef, useState } from "react";
import type { Call } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import { syncCallMedia } from "@/utils/callMedia";
import { callDebug } from "@/utils/callDebug";

export type AudioRoute = "speaker" | "earpiece";

export function useWebRTC(
  call: Call | null | undefined,
  isVideoCall: boolean,
  isActive: boolean,
) {
  const [audioRoute, setAudioRoute] = useState<AudioRoute>(
    isVideoCall ? "speaker" : "earpiece",
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const mediaReadyRef = useRef(false);

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
    applyAudioRoute(audioRoute === "speaker" ? "earpiece" : "speaker");
  }, [applyAudioRoute, audioRoute]);

  const flipCamera = useCallback(async () => {
    if (!call || !isVideoCall) return;
    try {
      await call.camera.flip();
      callDebug.log("camera-flip");
    } catch (err) {
      callDebug.warn("camera-flip-failed", err);
    }
  }, [call, isVideoCall]);

  useEffect(() => {
    if (!call || !isActive) {
      mediaReadyRef.current = false;
      return;
    }

    const unsubSession = call.on("call.session_participant_joined", (e) => {
      callDebug.log("participant-joined", e.participant?.user?.id);
    });

    callDebug.log("connection-change", call.state.callingState);

    return () => {
      unsubSession();
      mediaReadyRef.current = false;
    };
  }, [call, isActive]);

  useEffect(() => {
    if (
      !call ||
      !isActive ||
      call.state.callingState !== CallingState.JOINED ||
      mediaReadyRef.current
    ) {
      return;
    }

    mediaReadyRef.current = true;

    void syncCallMedia(call, isVideoCall)
      .then(() => {
        applyAudioRoute(isVideoCall ? "speaker" : "earpiece");
        setPermissionError(null);
      })
      .catch((err) => {
        mediaReadyRef.current = false;
        const message =
          err instanceof Error
            ? err.message
            : "Camera or microphone permission denied";
        setPermissionError(message);
        callDebug.warn("media-enable-failed", err);
      });
  }, [applyAudioRoute, call, isActive, isVideoCall]);

  return {
    audioRoute,
    permissionError,
    toggleSpeaker,
    flipCamera,
    applyAudioRoute,
  };
}
