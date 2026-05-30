import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
  AudienceLatencyLevelType,
} from "react-native-agora";
import { PermissionsAndroid, Platform } from "react-native";
import { fetchAgoraToken, emitLiveEvent } from "./agoraApi";
import {
  RtcConnectionState,
  type RtcCallState,
  type RtcChannelKind,
  type RtcParticipant,
} from "./types";

type EventHandler = (payload?: unknown) => void;

let sharedEngine: IRtcEngine | null = null;
let engineAppId: string | null = null;

export function getSharedRtcEngine(): IRtcEngine | null {
  return sharedEngine;
}

export async function initSharedRtcEngine(appId: string): Promise<IRtcEngine> {
  if (sharedEngine && engineAppId === appId) return sharedEngine;

  if (sharedEngine) {
    try {
      sharedEngine.release();
    } catch {
      /* ignore */
    }
    sharedEngine = null;
  }

  const engine = createAgoraRtcEngine();
  engine.initialize({ appId });
  engine.enableAudio();
  sharedEngine = engine;
  engineAppId = appId;
  return engine;
}

export function releaseSharedRtcEngine() {
  if (!sharedEngine) return;
  try {
    sharedEngine.leaveChannel();
    sharedEngine.release();
  } catch {
    /* ignore */
  }
  sharedEngine = null;
  engineAppId = null;
}

async function ensureAndroidPermissions(isVideo: boolean) {
  if (Platform.OS !== "android") return;
  const perms = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ...(isVideo ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
  ];
  await PermissionsAndroid.requestMultiple(perms);
}

export class RtcCall {
  readonly id: string;
  readonly kind: RtcChannelKind;
  currentUserId: string;
  ringing = false;
  isCreatedByMe = false;

  state: RtcCallState = {
    callingState: RtcConnectionState.IDLE,
    custom: {},
    remoteParticipants: [],
    localParticipant: null,
    backstage: true,
    endedAt: null,
    createdBy: null,
    settings: {
      video: { enabled: true },
      screensharing: { enabled: true },
    },
    ownCapabilities: [],
    createdAt: Date.now(),
  };

  screenShare = {
    enabled: false,
    enable: async () => {
      this.screenShare.enabled = true;
      this.emitState();
    },
    disable: async (_force?: boolean) => {
      this.screenShare.enabled = false;
      this.emitState();
    },
  };

  private listeners = new Map<string, Set<EventHandler>>();
  private engine: IRtcEngine | null = null;
  private joinedUid = 0;
  private micEnabled = true;
  private cameraEnabled = true;
  private speakerOn = true;

  camera = {
    state: { status: "disabled" as "enabled" | "disabled" },
    enable: async () => {
      this.cameraEnabled = true;
      this.camera.state.status = "enabled";
      this.engine?.enableVideo();
      this.engine?.startPreview();
      this.engine?.muteLocalVideoStream(false);
      this.emitState();
    },
    disable: async () => {
      this.cameraEnabled = false;
      this.camera.state.status = "disabled";
      this.engine?.muteLocalVideoStream(true);
      this.emitState();
    },
    toggle: async () => {
      if (this.cameraEnabled) await this.camera.disable();
      else await this.camera.enable();
    },
    flip: async () => {
      this.switchCamera();
    },
  };

  microphone = {
    state: { status: "disabled" as "enabled" | "disabled" },
    enable: async () => {
      this.micEnabled = true;
      this.microphone.state.status = "enabled";
      this.engine?.muteLocalAudioStream(false);
      this.emitState();
    },
    disable: async () => {
      this.micEnabled = false;
      this.microphone.state.status = "disabled";
      this.engine?.muteLocalAudioStream(true);
      this.emitState();
    },
    toggle: async () => {
      if (this.micEnabled) await this.microphone.disable();
      else await this.microphone.enable();
    },
  };

  constructor(id: string, kind: RtcChannelKind, userId: string) {
    this.id = id;
    this.kind = kind;
    this.currentUserId = userId;
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload?: unknown) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  private setCallingState(next: RtcConnectionState) {
    this.state.callingState = next;
    this.emitState();
  }

  private emitState() {
    this.emit("stateChanged");
  }

  async get(_opts?: { ring?: boolean; video?: boolean }) {
    this.setCallingState(RtcConnectionState.RINGING);
    return this;
  }

  /** Reuse a prior ended/declined call object for a new incoming ring. */
  resetForIncomingRing(opts?: {
    callMode?: string;
    custom?: Record<string, unknown>;
  }) {
    if (opts?.custom) {
      this.state.custom = { ...opts.custom };
    } else if (opts?.callMode) {
      this.state.custom = { ...this.state.custom, callMode: opts.callMode };
    }
    this.state.endedAt = null;
    this.ringing = false;
    this.isCreatedByMe = false;
    this.state.remoteParticipants = [];
    this.state.localParticipant = null;
    this.state.backstage = true;
    this.setCallingState(RtcConnectionState.IDLE);
    if (getActiveRtcCall() === this) {
      setActiveRtcCall(null);
    }
  }

  async getOrCreate(opts?: {
    data?: {
      members?: Array<{ user_id: string; role?: string }>;
      custom?: Record<string, unknown>;
      channel_cid?: string;
    };
    ring?: boolean;
    video?: boolean;
  }) {
    if (opts?.data?.custom) this.state.custom = opts.data.custom;
    if (opts?.data?.channel_cid) {
      this.state.custom.channel_cid = opts.data.channel_cid;
    }
    this.isCreatedByMe = true;
    this.ringing = Boolean(opts?.ring);
    this.state.settings = {
      video: { enabled: opts?.video !== false },
    };
    this.state.createdBy = { id: this.currentUserId };
    this.state.ownCapabilities = [
      "update_call_permissions",
      "mute_users",
      "send_audio",
      "send_video",
      "screenshare",
    ];
    this.setCallingState(RtcConnectionState.RINGING);

    if (opts?.ring && opts?.data?.members?.length) {
      const { inviteCall } = await import("./agoraApi");
      await inviteCall({
        channelName: this.id,
        callerId: this.currentUserId,
        memberIds: opts.data.members.map((m) => m.user_id),
        callMode: opts?.video === false ? "audio" : "video",
        channelCid: opts?.data?.channel_cid,
      });
    }
    return this;
  }

  async join(opts?: {
    create?: boolean;
    video?: boolean;
    maxJoinRetries?: number;
    role?: "host" | "viewer" | "publisher" | "audience";
  }) {
    const isVideo = opts?.video !== false;
    this.state.settings = { video: { enabled: isVideo } };
    await this.joinChannel({
      role:
        opts?.role === "audience" || opts?.role === "viewer"
          ? "audience"
          : "publisher",
      isVideo,
      profile:
        this.kind === "live"
          ? ChannelProfileType.ChannelProfileLiveBroadcasting
          : ChannelProfileType.ChannelProfileCommunication,
    });
    return this;
  }

  async joinChannel(opts: {
    role: "publisher" | "audience";
    isVideo: boolean;
    profile?: ChannelProfileType;
    tokenContext?: string;
  }) {
    const engine = sharedEngine;
    if (!engine) throw new Error("RTC engine not initialized");

    this.engine = engine;
    this.setCallingState(RtcConnectionState.JOINING);

    await ensureAndroidPermissions(opts.isVideo);

    const tokenRes = await fetchAgoraToken({
      channelName: this.id,
      userId: this.currentUserId,
      role: opts.role === "audience" ? "subscriber" : "publisher",
      context: opts.tokenContext || (this.kind === "live" ? "liveHost" : "call"),
    });

    this.joinedUid = tokenRes.uid;

    engine.setChannelProfile(
      opts.profile ?? ChannelProfileType.ChannelProfileCommunication,
    );

    if (opts.profile === ChannelProfileType.ChannelProfileLiveBroadcasting) {
      if (opts.role === "audience") {
        engine.setClientRole(ClientRoleType.ClientRoleAudience, {
          audienceLatencyLevel:
            AudienceLatencyLevelType.AudienceLatencyLevelUltraLow,
        });
      } else {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      }
    }

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => {
        this.setCallingState(RtcConnectionState.JOINED);
        this.state.backstage = false;
        this.state.localParticipant = {
          userId: this.currentUserId,
          uid: this.joinedUid,
          hasAudio: this.micEnabled,
          hasVideo: this.cameraEnabled,
        };
        if (opts.isVideo) {
          void this.camera.enable();
        } else {
          void this.camera.disable();
        }
        void this.microphone.enable();
        this.emit("call.session_participant_joined", {
          participant: { user: { id: this.currentUserId } },
        });
      },
      onUserJoined: (_connection, remoteUid) => {
        const participant: RtcParticipant = {
          userId: String(remoteUid),
          uid: remoteUid,
        };
        this.state.remoteParticipants = [
          ...this.state.remoteParticipants.filter((p) => p.uid !== remoteUid),
          participant,
        ];
        this.emit("call.session_participant_joined", {
          participant: { user: { id: String(remoteUid) } },
        });
        this.emit("call.accepted", { user: { id: String(remoteUid) } });
        this.emitState();
      },
      onUserOffline: (_connection, remoteUid) => {
        this.state.remoteParticipants = this.state.remoteParticipants.filter(
          (p) => p.uid !== remoteUid,
        );
        this.emitState();
      },
      onConnectionStateChanged: (_connection, state) => {
        if (state === ConnectionStateType.ConnectionStateReconnecting) {
          this.setCallingState(RtcConnectionState.RECONNECTING);
        } else if (state === ConnectionStateType.ConnectionStateConnected) {
          if (this.state.callingState !== RtcConnectionState.LEFT) {
            this.setCallingState(RtcConnectionState.JOINED);
          }
        }
      },
    };

    engine.registerEventHandler(handler);

    if (opts.isVideo) {
      engine.enableVideo();
      engine.startPreview();
    } else {
      engine.disableVideo();
    }

    engine.setDefaultAudioRouteToSpeakerphone(this.speakerOn);
    engine.joinChannel(tokenRes.token, this.id, tokenRes.uid, {
      clientRoleType:
        opts.role === "audience"
          ? ClientRoleType.ClientRoleAudience
          : ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: opts.role !== "audience",
      publishCameraTrack: opts.role !== "audience" && opts.isVideo,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });

    return this;
  }

  async goLive() {
    this.state.backstage = false;
    this.emitState();
  }

  async stopLive() {
    this.state.backstage = true;
    this.emit("call.ended");
    this.emitState();
  }

  setDisconnectionTimeout(_ms: number) {}

  async update(opts: { custom?: Record<string, unknown> }) {
    if (opts.custom) {
      this.state.custom = { ...this.state.custom, ...opts.custom };
      this.state.updatedAt = Date.now();
    }
    this.emitState();
    return this;
  }

  async delete(_opts?: { hard?: boolean }) {
    const { endLiveSession } = await import("./agoraApi");
    await endLiveSession(this.id, this.currentUserId).catch(() => {});
    return this;
  }

  async requestPermissions(_opts: { permissions: string[] }) {
    await this.sendCustomEvent({
      type: "speak_request",
      userId: this.currentUserId,
    });
    return this;
  }

  async muteOthers(_type: "audio" | "video" = "audio") {
    for (const p of this.state.remoteParticipants) {
      await this.muteUser(p.userId, "audio");
    }
  }

  async endCall() {
    await this.leave();
  }

  async leave(opts?: { reject?: boolean; reason?: string }) {
    this.setCallingState(RtcConnectionState.LEFT);
    this.state.endedAt = Date.now();
    this.ringing = false;
    try {
      this.engine?.leaveChannel();
    } catch {
      /* ignore */
    }
    if (opts?.reject) {
      this.emit("call.rejected", { reason: opts.reason });
    }
    this.emitState();
    return this;
  }

  async muteUser(_userId: string, _type: "audio" | "video" = "audio") {}

  async grantPermissions(_userId: string, _caps: string[]) {}

  async revokePermissions(_userId: string, _caps: string[]) {}

  async removeFromLive(_userId: string) {}

  async sendCustomEvent(event: { type: string; [key: string]: unknown }) {
    const typeMap: Record<string, string> = {
      live_chat: "live:chat",
      live_reaction: "live:reaction",
      live_join_ping: "live:join_ping",
      speak_request: "live:speak_request",
      speak_invite: "live:guest_invite",
      speak_denied: "live:speak_denied",
    };
    const socketType = typeMap[event.type] || event.type;
    await emitLiveEvent(this.id, socketType, event);
  }

  setPreferredIncomingVideoResolution(_res: { width: number; height: number }) {}

  setIncomingVideoEnabled(_enabled: boolean) {}

  switchCamera() {
    this.engine?.switchCamera();
  }

  setSpeakerphone(enabled: boolean) {
    this.speakerOn = enabled;
    this.engine?.setEnableSpeakerphone(enabled);
  }

  isMicEnabled() {
    return this.micEnabled;
  }

  isCameraEnabled() {
    return this.cameraEnabled;
  }
}

export class AgoraRtcClient {
  userId: string;
  state = {
    calls: [] as RtcCall[],
  };

  constructor(userId: string) {
    this.userId = userId;
  }

  call(kind: RtcChannelKind | "default" | "livestream" | "audio_room", id: string) {
    const mapped: RtcChannelKind =
      kind === "default"
        ? "call"
        : kind === "livestream"
          ? "live"
          : kind === "audio_room"
            ? "audio_room"
            : kind;
    const existing = this.state.calls.find((c) => c.id === id);
    if (existing) {
      if (existing.state.callingState === RtcConnectionState.LEFT) {
        existing.resetForIncomingRing();
      }
      return existing;
    }
    const call = new RtcCall(id, mapped, this.userId);
    this.state.calls.push(call);
    return call;
  }

  on(_event: string, _handler: EventHandler) {
    return () => {};
  }

  async disconnectUser() {
    releaseSharedRtcEngine();
    this.state.calls = [];
  }
}

export const rtcDeviceManager = {
  start: (opts?: { audioRole?: string; deviceEndpointType?: string }) => {
    const call = getActiveRtcCall();
    if (!call) return;
    const speaker = opts?.deviceEndpointType === "speaker";
    call.setSpeakerphone(speaker);
  },
  stop: () => {},
};

let activeCallRef: RtcCall | null = null;

export function setActiveRtcCall(call: RtcCall | null) {
  activeCallRef = call;
}

export function getActiveRtcCall() {
  return activeCallRef;
}

export function isUserBusyInRtcCall(excludeChannelName?: string): boolean {
  if (!activeCallRef) return false;
  if (excludeChannelName && activeCallRef.id === excludeChannelName) return false;
  const st = activeCallRef.state.callingState;
  return (
    st === RtcConnectionState.JOINED ||
    st === RtcConnectionState.JOINING ||
    st === RtcConnectionState.RINGING ||
    st === RtcConnectionState.RECONNECTING
  );
}
