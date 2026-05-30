import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { ScreenCapturePickerView } from "@stream-io/react-native-webrtc";
import {
  OwnCapability,
  useCallStateHooks,
  useScreenShareButton,
} from "@stream-io/video-react-native-sdk";
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

/**
 * Wires Stream's screen-share flow (iOS broadcast picker + publish checks)
 * for audio room presentation.
 */
export default function AudioScreenShareProvider({ children }: Props) {
  const screenCapturePickerRef = useRef(null);
  const { useOwnCapabilities, useCallSettings } = useCallStateHooks();
  const ownCapabilities = useOwnCapabilities();
  const callSettings = useCallSettings();

  const hasScreenShareCapability = ownCapabilities?.includes(
    OwnCapability.SCREENSHARE,
  );
  const screenSharingEnabledInCall =
    callSettings?.screensharing.enabled ?? false;

  const onMissingPermission = useCallback(() => {
    Alert.alert(
      "Presentation unavailable",
      "You do not have permission to share your screen in this room. Only hosts and moderators can present.",
    );
  }, []);

  const { onPress, hasPublishedScreenShare } = useScreenShareButton(
    screenCapturePickerRef,
    undefined,
    undefined,
    onMissingPermission,
  );

  const canPresent =
    Boolean(onPress) &&
    hasScreenShareCapability &&
    screenSharingEnabledInCall;

  const togglePresent = useCallback(() => {
    if (!onPress) {
      if (!screenSharingEnabledInCall) {
        Alert.alert(
          "Presentation unavailable",
          "Screen sharing is not enabled for this audio room.",
        );
      } else if (!hasScreenShareCapability) {
        onMissingPermission();
      }
      return;
    }

    void onPress().catch((err) => {
      console.error("screen share error:", err);
      alertScreenShareError(err);
    });
  }, [
    hasScreenShareCapability,
    onMissingPermission,
    onPress,
    screenSharingEnabledInCall,
  ]);

  const value = useMemo(
    () => ({
      canPresent,
      isPresenting: hasPublishedScreenShare,
      togglePresent,
    }),
    [canPresent, hasPublishedScreenShare, togglePresent],
  );

  return (
    <AudioScreenShareContext.Provider value={value}>
      {children}
      {Platform.OS === "ios" && (
        <View style={styles.hiddenPicker} pointerEvents="none">
          <ScreenCapturePickerView ref={screenCapturePickerRef} />
        </View>
      )}
    </AudioScreenShareContext.Provider>
  );
}

const styles = StyleSheet.create({
  hiddenPicker: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
});
