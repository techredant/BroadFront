import type { IncomingCallPayload } from "@/components/notifications/IncomingCallOverlay";

type IncomingCallHandler = (payload: IncomingCallPayload) => void;

let handler: IncomingCallHandler | null = null;
let pendingPayload: IncomingCallPayload | null = null;

export function setIncomingCallDispatcher(next: IncomingCallHandler | null) {
  handler = next;

  if (next && pendingPayload) {
    next(pendingPayload);
    pendingPayload = null;
  }
}

export function dispatchIncomingCall(payload: IncomingCallPayload) {
  if (handler) {
    handler(payload);
    return;
  }

  pendingPayload = payload;
}
