import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { OwnCapability, useCall, useCallStateHooks } from "@/rtc";
import { toggleCallScreenShare } from "@/utils/screenShareHelper";
import { alertScreenShareError } from "@/utils/screenShareHelper";

type AudioScreenShareContextValue = {
  canPresent: boolean;
  isPresenting: boolean;
  togglePresent: () => void;
};

const AudioScreenShareContext = createContext<AudioScreenShareContextValue>({
  canPresent: false,
  isPresenting: false,
  togglePresent: () => {},
});

export function useAudioScreenShare() {
  return useContext(AudioScreenShareContext);
}

type Props = { children: ReactNode };

/** Screen-share controls for audio room presentation. */
export default function AudioScreenShareProvider({ children }: Props) {
  const call = useCall();
  const { useOwnCapabilities, useCallSettings } = useCallStateHooks();
  const ownCapabilities = useOwnCapabilities();
  const callSettings = useCallSettings();

  const hasScreenShareCapability = ownCapabilities?.includes(
    OwnCapability.SCREENSHARE,
  );
  const screenSharingEnabledInCall =
    callSettings?.screensharing?.enabled ?? false;

  const onMissingPermission = useCallback(() => {
    Alert.alert(
      "Presentation unavailable",
      "You do not have permission to share your screen in this room. Only hosts and moderators can present.",
    );
  }, []);

  const isPresenting = call?.screenShare.enabled ?? false;

  const canPresent = Boolean(
    call && hasScreenShareCapability && screenSharingEnabledInCall,
  );

  const togglePresent = useCallback(() => {
    if (!call) return;
    if (!screenSharingEnabledInCall) {
      Alert.alert(
        "Presentation unavailable",
        "Screen sharing is not enabled for this audio room.",
      );
      return;
    }
    if (!hasScreenShareCapability) {
      onMissingPermission();
      return;
    }

    void toggleCallScreenShare(call).catch((err) => {
      console.error("screen share error:", err);
      alertScreenShareError(err);
    });
  }, [
    call,
    hasScreenShareCapability,
    onMissingPermission,
    screenSharingEnabledInCall,
  ]);

  const value = useMemo(
    () => ({
      canPresent,
      isPresenting,
      togglePresent,
    }),
    [canPresent, isPresenting, togglePresent],
  );

  return (
    <AudioScreenShareContext.Provider value={value}>
      {children}
    </AudioScreenShareContext.Provider>
  );
}
