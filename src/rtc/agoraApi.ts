import { API_PUBLIC_URL } from "@/constants/api";
import type { AgoraTokenResponse, RtcCallMode } from "./types";

const BASE = API_PUBLIC_URL;

function formatApiError(data: unknown, path: string, status: number): string {
  if (!data || typeof data !== "object") {
    return `Request failed (${status}): ${path}`;
  }

  const obj = data as Record<string, unknown>;
  const errField = obj.error ?? obj.message;

  if (typeof errField === "string" && errField.trim()) {
    return errField;
  }

  if (Array.isArray(errField)) {
    return errField.map(String).join(", ");
  }

  if (errField && typeof errField === "object") {
    const nested = errField as Record<string, unknown>;
    if (typeof nested.message === "string") return nested.message;
    try {
      return JSON.stringify(errField);
    } catch {
      /* fall through */
    }
  }

  return `Request failed (${status}): ${path}`;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status}): ${path} — invalid JSON response`);
  }

  if (!res.ok || (data as { ok?: boolean })?.ok === false) {
    throw new Error(formatApiError(data, path, res.status));
  }
  return data as T;
}

export async function fetchAgoraAppId(): Promise<string> {
  const res = await fetch(`${BASE}/api/agora/app-id`);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Agora app id unavailable (${res.status})`);
  }
  const obj = data as { appId?: string; error?: unknown };
  if (!res.ok || !obj?.appId) {
    throw new Error(formatApiError(data, "/api/agora/app-id", res.status));
  }
  return obj.appId;
}

export async function fetchAgoraToken(opts: {
  channelName: string;
  userId: string;
  role?: string;
  context?: string;
}): Promise<AgoraTokenResponse> {
  return postJson<AgoraTokenResponse>("/api/agora/token", {
    channelName: opts.channelName,
    userId: opts.userId,
    role: opts.role || "publisher",
    context: opts.context || "call",
  });
}

export async function inviteCall(opts: {
  channelName: string;
  callerId: string;
  memberIds: string[];
  callMode: RtcCallMode;
  channelCid?: string;
  callerName?: string;
  callerImage?: string;
}) {
  await endCall(opts.channelName, opts.callerId, "cancel").catch(() => {});
  return postJson("/api/agora/calls/invite", opts);
}

export async function acceptCall(channelName: string, userId: string) {
  return postJson("/api/agora/calls/accept", { channelName, userId });
}

export async function declineCall(
  channelName: string,
  userId: string,
  reason: "decline" | "cancel" | "busy" = "decline",
) {
  return postJson("/api/agora/calls/decline", { channelName, userId, reason });
}

export async function endCall(channelName: string, userId?: string, reason = "hangup") {
  return postJson("/api/agora/calls/end", { channelName, userId, reason });
}

export type CallSessionRecord = {
  channelName: string;
  callerId: string;
  memberIds: string[];
  callMode: string;
  status: "ringing" | "active" | "ended";
  acceptedBy?: string[];
};

export async function fetchCallSession(
  channelName: string,
): Promise<CallSessionRecord | null> {
  try {
    const res = await fetch(
      `${BASE}/api/agora/calls/session/${encodeURIComponent(channelName)}`,
    );
    const data = await res.json();
    if (!res.ok || !data?.session) return null;
    return data.session as CallSessionRecord;
  } catch {
    return null;
  }
}

export async function fetchIncomingRings(
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(
      `${BASE}/api/agora/calls/incoming/${encodeURIComponent(userId)}`,
    );
    const data = await res.json();
    if (!res.ok || !Array.isArray(data?.rings)) return [];
    return data.rings;
  } catch {
    return [];
  }
}

export async function startLiveSession(body: Record<string, unknown>) {
  return postJson("/api/agora/live/start", body);
}

export async function endLiveSession(callId: string, hostClerkId?: string) {
  return postJson("/api/agora/live/end", { callId, hostClerkId });
}

export async function fetchActiveLives(variant?: string, includeEnded = false) {
  const params = new URLSearchParams();
  if (variant) params.set("variant", variant);
  if (includeEnded) params.set("includeEnded", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/api/agora/live/active${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch lives");
  return data.sessions as Array<Record<string, unknown>>;
}

export async function joinLiveViewer(callId: string, userId?: string, userName?: string) {
  return postJson("/api/agora/live/viewer/join", { callId, userId, userName });
}

export async function leaveLiveViewer(
  callId: string,
  userId?: string,
  userName?: string,
) {
  return postJson("/api/agora/live/viewer/leave", { callId, userId, userName });
}

export async function inviteLiveGuest(body: Record<string, unknown>) {
  return postJson("/api/agora/live/guest/invite", body);
}

export async function denyLiveGuest(body: Record<string, unknown>) {
  return postJson("/api/agora/live/guest/deny", body);
}

export async function emitLiveEvent(
  callId: string,
  type: string,
  payload: Record<string, unknown> = {},
) {
  return postJson("/api/agora/live/event", { callId, type, payload });
}

export type PolledLiveEvent = Record<string, unknown> & {
  type?: string;
  eventId?: string;
  createdAt?: number;
};

export async function fetchLiveEvents(
  callId: string,
  sinceMs: number,
  userId?: string,
): Promise<{
  ok: boolean;
  events: PolledLiveEvent[];
  cursor: number;
  serverTime: number;
}> {
  const params = new URLSearchParams();
  if (sinceMs > 0) params.set("since", String(sinceMs));
  if (userId) params.set("userId", userId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${BASE}/api/agora/live/${encodeURIComponent(callId)}/events${qs}`,
  );
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status}): live events — invalid JSON`);
  }
  if (!res.ok || (data as { ok?: boolean })?.ok === false) {
    throw new Error(formatApiError(data, `/api/agora/live/${callId}/events`, res.status));
  }
  return data as {
    ok: boolean;
    events: PolledLiveEvent[];
    cursor: number;
    serverTime: number;
  };
}
