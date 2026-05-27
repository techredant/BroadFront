import { CallingState } from "@stream-io/video-react-native-sdk";

export type CallSessionStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "declined"
  | "missed"
  | "ended"
  | "busy"
  | "reconnecting";

export function mapCallingStateToStatus(
  callingState: CallingState,
  opts: { ringing?: boolean; isCaller?: boolean },
): CallSessionStatus {
  if (callingState === CallingState.LEFT) return "ended";
  if (callingState === CallingState.JOINED) return "connected";
  if (callingState === CallingState.JOINING) return "connecting";
  if (opts.ringing || callingState === CallingState.RINGING) return "ringing";
  if (callingState === CallingState.IDLE) {
    return opts.isCaller ? "connecting" : "ringing";
  }
  return "connecting";
}

export function statusLabel(status: CallSessionStatus): string {
  switch (status) {
    case "ringing":
      return "Ringing…";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "declined":
      return "Declined";
    case "missed":
      return "Missed call";
    case "ended":
      return "Call ended";
    case "busy":
      return "User busy";
    case "reconnecting":
      return "Reconnecting…";
    default:
      return "";
  }
}
