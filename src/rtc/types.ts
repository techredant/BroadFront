export enum RtcConnectionState {
  IDLE = "idle",
  RINGING = "ringing",
  JOINING = "joining",
  JOINED = "joined",
  RECONNECTING = "reconnecting",
  LEFT = "left",
}

export type RtcCallMode = "video" | "audio";

export type RtcChannelKind = "call" | "live" | "audio_room";

export type RtcParticipant = {
  userId: string;
  uid: number;
  name?: string;
  image?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
};

/** Stream-compatible participant shape for UI hooks */
export type EnrichedRtcParticipant = RtcParticipant & {
  sessionId: string;
  isLocalParticipant: boolean;
  isSpeaking: boolean;
  publishedTracks: string[];
};

export type LiveSessionRecord = {
  callId: string;
  hostClerkId?: string;
  variant?: string;
  roomTitle?: string;
  level?: string;
  viewerCount?: number;
  startedAt?: string;
  custom?: Record<string, unknown>;
};

export type PermissionRequestEvent = {
  user: { id: string; name?: string };
  permissions: string[];
};

export type RtcCallState = {
  callingState: RtcConnectionState;
  custom: Record<string, unknown>;
  remoteParticipants: RtcParticipant[];
  localParticipant: RtcParticipant | null;
  backstage: boolean;
  endedAt: number | null;
  createdBy: { id?: string; name?: string } | null;
  settings?: {
    video?: { enabled?: boolean };
    screensharing?: { enabled?: boolean };
  };
  ownCapabilities?: string[];
  participants?: unknown[];
  updatedAt?: number;
  createdAt?: number;
};

export type CallRingPayload = {
  channelName: string;
  callerId: string;
  callerName?: string;
  callerImage?: string | null;
  callMode: RtcCallMode;
  channelCid?: string | null;
  memberIds?: string[];
  rungAt?: string;
};

export type AgoraTokenResponse = {
  ok: boolean;
  token: string;
  appId: string;
  uid: number;
  channelName: string;
  role: string;
};
