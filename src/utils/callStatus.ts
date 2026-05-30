import { CallingState } from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";

export { CallingState };

export type CallUiStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export function mapCallingStateToStatus(
  state: string | RtcConnectionState | undefined,
): CallUiStatus {
  switch (state) {
    case CallingState.RINGING:
    case RtcConnectionState.RINGING:
      return "ringing";
    case CallingState.JOINING:
    case RtcConnectionState.JOINING:
      return "connecting";
    case CallingState.JOINED:
    case RtcConnectionState.JOINED:
      return "connected";
    case CallingState.RECONNECTING:
    case RtcConnectionState.RECONNECTING:
      return "reconnecting";
    case CallingState.LEFT:
    case RtcConnectionState.LEFT:
      return "ended";
    default:
      return "idle";
  }
}

export function statusLabel(status: CallUiStatus): string {
  switch (status) {
    case "ringing":
      return "Ringing…";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "reconnecting":
      return "Reconnecting…";
    case "ended":
      return "Call ended";
    default:
      return "";
  }
}
