import type { RtcCall } from "@/rtc/RtcCall";
import type { LiveSessionRecord } from "@/rtc/types";

export type CallLike =
  | Pick<RtcCall, "state">
  | LiveSessionRecord
  | {
      id?: string;
      state?: {
        endedAt?: number | Date | null;
        session?: { ended_at?: string };
        backstage?: boolean;
        custom?: Record<string, unknown>;
        createdBy?: { id?: string };
      };
    };

function readState(call: CallLike) {
  if ("callId" in call && !("state" in call)) {
    return {
      endedAt: null,
      backstage: false,
      custom: call.custom ?? {},
    };
  }
  return call.state ?? {};
}

/** Call has ended on the server or locally. */
export function isStreamCallEnded(call: CallLike): boolean {
  const state = readState(call);
  if (state.endedAt != null) return true;
  const sessionEnded = state.session?.ended_at;
  if (sessionEnded) return true;
  return false;
}

/** Not ended — may still be in backstage. */
export function isStreamCallActive(call: CallLike): boolean {
  return !isStreamCallEnded(call);
}

/** Currently broadcasting (past backstage). */
export function isStreamCallOnAir(call: CallLike): boolean {
  if ("callId" in call && !("state" in call)) return true;
  if (isStreamCallEnded(call)) return false;
  const state = readState(call);
  return state.backstage === false;
}

/** Discovery filter for livestreams — on-air only. */
export function isStreamCallLive(call: CallLike): boolean {
  return isStreamCallOnAir(call);
}
