import { Alert, Linking, Platform } from "react-native";
import type { RtcCall } from "@/rtc/RtcCall";

type ScreenShareError = {
  message?: string;
  name?: string;
  code?: string;
};

function isPermissionDenied(err: ScreenShareError): boolean {
  const msg = (err.message ?? "").toLowerCase();
  const name = (err.name ?? "").toLowerCase();
  return (
    name.includes("notallowed") ||
    name.includes("permission") ||
    msg.includes("permission") ||
    msg.includes("denied") ||
    msg.includes("cancel") ||
    err.code === "PERMISSION_DENIED"
  );
}

function isUnsupported(err: ScreenShareError): boolean {
  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes("not supported") ||
    msg.includes("unsupported") ||
    msg.includes("unimplemented")
  );
}

/** User-facing message when screen share fails on this device/OS. */
export function getScreenShareErrorMessage(err: unknown): string {
  const e = err as ScreenShareError;

  if (isPermissionDenied(e)) {
    return Platform.OS === "ios"
      ? "Screen sharing permission was denied. Enable Screen Recording for Broadcast in Settings, then try again."
      : "Display capture permission was denied. Allow screen capture when prompted, or enable it in app settings.";
  }

  if (isUnsupported(e)) {
    return Platform.OS === "ios"
      ? "Screen sharing may require a supported iOS version and the system broadcast extension. Try on a physical device running iOS 14+."
      : "Screen sharing is not supported on this Android device or OS version.";
  }

  if (e.message) return e.message;

  return Platform.OS === "ios"
    ? "Could not start presentation. Use a physical iPhone/iPad and accept the broadcast permission."
    : "Could not start presentation. Grant display capture permission and try again.";
}

export function alertScreenShareError(err: unknown) {
  const message = getScreenShareErrorMessage(err);
  Alert.alert("Presentation unavailable", message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Open settings",
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
}

export async function toggleCallScreenShare(
  call: RtcCall,
): Promise<"started" | "stopped"> {
  if (call.screenShare.enabled) {
    await call.screenShare.disable(true);
    return "stopped";
  }

  try {
    await call.screenShare.enable();
    return "started";
  } catch (err) {
    alertScreenShareError(err);
    throw err;
  }
}
